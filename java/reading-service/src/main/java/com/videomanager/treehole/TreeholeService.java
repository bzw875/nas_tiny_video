package com.videomanager.treehole;

import com.videomanager.common.BadRequestException;
import com.videomanager.treehole.dto.PageQuery;
import com.videomanager.treehole.dto.QueryTreeholeDto;
import java.sql.Timestamp;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class TreeholeService {

    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_KEYWORD_LENGTH = 100;
    private static final int MAX_AUTHOR_LENGTH = 100;

    /** 与 treeholeSelf 前端 FieldEnum 一致；只允许这几个排序字段。 */
    private static final Map<String, String> ORDER_COLUMNS = Map.of(
        "date_gmt", "c.date_gmt",
        "vote_positive", "c.vote_positive",
        "vote_negative", "c.vote_negative",
        "sub_comment_count", "c.sub_comment_count"
    );

    private static final Set<String> SORT_DIRECTIONS = Set.of("ASC", "DESC");
    private static final Pattern VOTE_RANGE = Pattern.compile("^\\d{1,6}-(\\d{1,6}|∞)$");
    private static final List<String> TIMESTAMP_KEYS = List.of(
        "dateGmt", "createdAt", "updatedAt", "publishTime", "lastReplyTime"
    );
    /**
     * 数据库里这些列是 BIGINT，而全局 Jackson 配置把所有 Long 序列化成字符串（避免 JS 精度丢失）。
     * 计数类字段不存在精度问题，这里统一转成 int，前端可以直接做数值运算。
     */
    private static final List<String> COUNT_KEYS = List.of(
        "authorType", "votePositive", "voteNegative", "subCommentCount", "avatarType",
        "authorMembership", "replyCount", "readCount",
        "totalLikes", "totalDislikes", "commentsReceived", "articlesPosted"
    );
    private static final DateTimeFormatter TIMESTAMP_FORMAT =
        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final TreeholeMapper treeholeMapper;
    private final String schema;

    public TreeholeService(TreeholeMapper treeholeMapper, TreeholeProperties properties) {
        this.treeholeMapper = treeholeMapper;
        this.schema = properties.schema();
    }

    public Map<String, Object> list(QueryTreeholeDto dto) {
        int page = dto.page() == null ? 0 : dto.page();
        int size = dto.size() == null ? DEFAULT_PAGE_SIZE : Math.min(dto.size(), MAX_PAGE_SIZE);
        String field = dto.field() == null || dto.field().isBlank() ? "date_gmt" : dto.field().trim();
        String sort = dto.sort() == null || dto.sort().isBlank() ? "DESC" : dto.sort().trim().toUpperCase();

        String column = ORDER_COLUMNS.get(field);
        if (column == null) {
            throw new BadRequestException("field must be one of " + ORDER_COLUMNS.keySet());
        }
        if (!SORT_DIRECTIONS.contains(sort)) {
            throw new BadRequestException("sort must be ASC or DESC");
        }

        VoteRange range = parseLikeRange(dto.likeRange());
        String orderBy = column + " " + sort + (column.equals("c.date_gmt") ? ", c.id " + sort : "");
        long offset = (long) page * size;

        long total = treeholeMapper.countComments(schema, range.min(), range.max());
        List<Map<String, Object>> items = treeholeMapper.selectComments(
            schema, range.min(), range.max(), orderBy, size, offset
        );

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("items", normalizeRows(items));
        result.put("total", (int) total);
        result.put("page", page);
        result.put("size", size);
        result.put("field", field);
        result.put("sort", sort);
        result.put("likeRange", dto.likeRange() == null ? "" : dto.likeRange());
        return result;
    }

    public Map<String, Object> byAuthor(String author, PageQuery pageQuery) {
        String value = author == null ? "" : author.trim();
        if (value.isEmpty()) {
            throw new BadRequestException("author is required");
        }
        if (value.length() > MAX_AUTHOR_LENGTH) {
            throw new BadRequestException("author is too long");
        }
        int page = pageQuery == null || pageQuery.page() == null ? 0 : pageQuery.page();
        int size = pageQuery == null || pageQuery.size() == null
            ? DEFAULT_PAGE_SIZE
            : Math.min(pageQuery.size(), MAX_PAGE_SIZE);
        long total = treeholeMapper.countCommentsByAuthor(schema, value);
        List<Map<String, Object>> items = normalizeRows(
            treeholeMapper.selectCommentsByAuthor(schema, value, size, (long) page * size)
        );
        return pageResult(items, total, page, size);
    }

    public Map<String, Object> search(String keyword, PageQuery pageQuery) {
        String value = keyword == null ? "" : keyword.trim();
        int page = pageQuery == null || pageQuery.page() == null ? 0 : pageQuery.page();
        int size = pageQuery == null || pageQuery.size() == null
            ? DEFAULT_PAGE_SIZE
            : Math.min(pageQuery.size(), MAX_PAGE_SIZE);
        if (value.isEmpty()) {
            return pageResult(List.of(), 0, page, size);
        }
        if (value.length() > MAX_KEYWORD_LENGTH) {
            throw new BadRequestException("q is too long");
        }
        long total = treeholeMapper.countSearchComments(schema, value);
        List<Map<String, Object>> items = normalizeRows(
            treeholeMapper.searchComments(schema, value, size, (long) page * size)
        );
        return pageResult(items, total, page, size);
    }

    public Map<String, Object> statistics() {
        return pageResult(normalizeRows(treeholeMapper.selectAuthorStatistics(schema)));
    }

    public Map<String, Object> aishPosts() {
        return pageResult(normalizeRows(treeholeMapper.selectAishPosts(schema)));
    }

    private Map<String, Object> pageResult(List<Map<String, Object>> items) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("items", items);
        result.put("total", items.size());
        return result;
    }

    private Map<String, Object> pageResult(
        List<Map<String, Object>> items,
        long total,
        int page,
        int size
    ) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("items", items);
        result.put("total", (int) total);
        result.put("page", page);
        result.put("size", size);
        return result;
    }

    /** 统一 JDBC 返回类型：时间转 ISO 字符串、计数转 int。 */
    private List<Map<String, Object>> normalizeRows(List<Map<String, Object>> rows) {
        for (Map<String, Object> row : rows) {
            for (String key : TIMESTAMP_KEYS) {
                Object value = row.get(key);
                if (value instanceof Timestamp timestamp) {
                    row.put(key, timestamp.toLocalDateTime().format(TIMESTAMP_FORMAT));
                }
            }
            for (String key : COUNT_KEYS) {
                Object value = row.get(key);
                if (value instanceof Number number) {
                    row.put(key, number.intValue());
                }
            }
        }
        return rows;
    }

    private VoteRange parseLikeRange(String raw) {
        if (raw == null || raw.isBlank()) {
            return new VoteRange(null, null);
        }
        String value = raw.trim();
        if (!VOTE_RANGE.matcher(value).matches()) {
            throw new BadRequestException("likeRange must look like 0-25 or 401-∞");
        }
        String[] parts = value.split("-");
        int min = Integer.parseInt(parts[0]);
        Integer max = "∞".equals(parts[1]) ? null : Integer.parseInt(parts[1]);
        if (max != null && max < min) {
            throw new BadRequestException("likeRange max must be greater than or equal to min");
        }
        return new VoteRange(min, max);
    }

    private record VoteRange(Integer min, Integer max) {
    }
}

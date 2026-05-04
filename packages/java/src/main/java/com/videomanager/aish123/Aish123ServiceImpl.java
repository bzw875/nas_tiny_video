package com.videomanager.aish123;

import com.videomanager.aish123.dto.QueryAish123Dto;
import com.videomanager.common.NotFoundException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

@Service
public class Aish123ServiceImpl implements Aish123Service {

    private final JdbcTemplate jdbcTemplate;

    public Aish123ServiceImpl(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Map<String, Object> findAll(QueryAish123Dto dto) {
        int skip = dto.skip() == null ? 0 : Math.max(dto.skip(), 0);
        int take = dto.take() == null ? 50 : Math.min(Math.max(dto.take(), 1), 200);

        StringBuilder where = new StringBuilder(" FROM `aish123` a WHERE 1=1");
        List<Object> args = new ArrayList<>();

        if (dto.fid() != null) {
            where.append(" AND a.fid = ?");
            args.add(dto.fid());
        }
        if (dto.typeName() != null && !dto.typeName().isBlank()) {
            String tn = dto.typeName().trim();
            if ("__NONE__".equals(tn)) {
                where.append(" AND (a.type_name IS NULL OR TRIM(COALESCE(a.type_name,'')) = '')");
            } else {
                where.append(" AND a.type_name = ?");
                args.add(tn);
            }
        }
        if (dto.search() != null && !dto.search().isBlank()) {
            where.append(" AND (a.title LIKE ? OR a.author_name LIKE ? OR a.last_reply_name LIKE ?)");
            String q = "%" + dto.search().trim() + "%";
            args.add(q);
            args.add(q);
            args.add(q);
        }

        String orderBy = buildOrderBy(dto.sortBy(), dto.sortOrder());
        List<Object> listArgs = new ArrayList<>(args);
        listArgs.add(skip);
        listArgs.add(take);

        String listSql = "SELECT a.tid, a.fid, a.title, a.url, a.type_name, a.is_sticky, a.is_digest, a.is_locked,"
            + " a.has_attachment, a.has_image, a.price, a.author_uid, a.author_name, a.author_url, a.created_at,"
            + " a.reply_count, a.view_count, a.last_reply_uid, a.last_reply_name, a.last_reply_at, a.rating,"
            + " a.page_index, a.raw_row_html, a.first_seen_at, a.updated_at"
            + where + orderBy + " LIMIT ?, ?";
        List<Map<String, Object>> items = jdbcTemplate.query(listSql, listArgs.toArray(), rowMapper());

        String countSql = "SELECT COUNT(*)" + where;
        Long total = jdbcTemplate.queryForObject(countSql, args.toArray(), Long.class);

        Map<String, Object> result = new HashMap<>();
        result.put("items", items);
        result.put("total", total == null ? 0L : total);
        result.put("skip", skip);
        result.put("take", take);
        return result;
    }

    @Override
    public Map<String, Object> countByTypeName() {
        Long total = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM `aish123`", Long.class);
        String sql = "SELECT a.type_name, COUNT(*) AS cnt FROM `aish123` a GROUP BY a.type_name ORDER BY cnt DESC, a.type_name ASC";
        List<Map<String, Object>> items = jdbcTemplate.query(sql, (rs, rowNum) -> {
            Map<String, Object> row = new HashMap<>();
            row.put("type_name", rs.getString("type_name"));
            row.put("count", rs.getLong("cnt"));
            return row;
        });
        Map<String, Object> result = new HashMap<>();
        result.put("total", total == null ? 0L : total);
        result.put("items", items);
        return result;
    }

    @Override
    public Map<String, Object> findOne(int tid) {
        String sql = "SELECT a.tid, a.fid, a.title, a.url, a.type_name, a.is_sticky, a.is_digest, a.is_locked,"
            + " a.has_attachment, a.has_image, a.price, a.author_uid, a.author_name, a.author_url, a.created_at,"
            + " a.reply_count, a.view_count, a.last_reply_uid, a.last_reply_name, a.last_reply_at, a.rating,"
            + " a.page_index, a.raw_row_html, a.first_seen_at, a.updated_at"
            + " FROM `aish123` a WHERE a.tid = ?";
        List<Map<String, Object>> rows = jdbcTemplate.query(sql, rowMapper(), tid);
        if (rows.isEmpty()) {
            throw new NotFoundException("aish123 thread " + tid + " not found");
        }
        return rows.get(0);
    }

    private RowMapper<Map<String, Object>> rowMapper() {
        return (rs, rowNum) -> {
            Map<String, Object> row = new HashMap<>();
            row.put("tid", rs.getInt("tid"));
            row.put("fid", rs.getInt("fid"));
            row.put("title", rs.getString("title"));
            row.put("url", rs.getString("url"));
            row.put("type_name", rs.getString("type_name"));
            row.put("is_sticky", rs.getInt("is_sticky"));
            row.put("is_digest", rs.getInt("is_digest"));
            row.put("is_locked", rs.getInt("is_locked"));
            row.put("has_attachment", rs.getInt("has_attachment"));
            row.put("has_image", rs.getInt("has_image"));
            row.put("price", rs.getInt("price"));
            int authorUid = rs.getInt("author_uid");
            row.put("author_uid", rs.wasNull() ? null : authorUid);
            row.put("author_name", rs.getString("author_name"));
            row.put("author_url", rs.getString("author_url"));
            row.put("created_at", toInstant(rs.getTimestamp("created_at")));
            row.put("reply_count", rs.getInt("reply_count"));
            row.put("view_count", rs.getInt("view_count"));
            int lastReplyUid = rs.getInt("last_reply_uid");
            row.put("last_reply_uid", rs.wasNull() ? null : lastReplyUid);
            row.put("last_reply_name", rs.getString("last_reply_name"));
            row.put("last_reply_at", toInstant(rs.getTimestamp("last_reply_at")));
            double rating = rs.getDouble("rating");
            row.put("rating", rs.wasNull() ? null : rating);
            int pageIndex = rs.getInt("page_index");
            row.put("page_index", rs.wasNull() ? null : pageIndex);
            row.put("raw_row_html", rs.getString("raw_row_html"));
            row.put("first_seen_at", toInstant(rs.getTimestamp("first_seen_at")));
            row.put("updated_at", toInstant(rs.getTimestamp("updated_at")));
            return row;
        };
    }

    private static Instant toInstant(Timestamp ts) {
        return ts == null ? null : ts.toInstant();
    }

    private String buildOrderBy(String sortBy, String sortOrder) {
        String direction = "asc".equalsIgnoreCase(sortOrder) ? "ASC" : "DESC";
        String field = sortBy == null || sortBy.isBlank() ? "updated_at" : sortBy;
        Map<String, String> columnMap = Map.ofEntries(
            Map.entry("tid", "a.tid"),
            Map.entry("fid", "a.fid"),
            Map.entry("title", "a.title"),
            Map.entry("reply_count", "a.reply_count"),
            Map.entry("view_count", "a.view_count"),
            Map.entry("page_index", "a.page_index"),
            Map.entry("created_at", "a.created_at"),
            Map.entry("last_reply_at", "a.last_reply_at"),
            Map.entry("first_seen_at", "a.first_seen_at"),
            Map.entry("updated_at", "a.updated_at"),
            Map.entry("price", "a.price")
        );
        String col = columnMap.getOrDefault(field, "a.updated_at");
        return " ORDER BY " + col + " " + direction + ", a.tid " + direction;
    }
}

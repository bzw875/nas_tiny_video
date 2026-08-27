package com.videomanager.aish123;

import com.fasterxml.jackson.core.type.TypeReference;
import com.videomanager.aish123.dto.QueryAish123Dto;
import com.videomanager.common.CacheKeys;
import com.videomanager.common.CacheNamespaces;
import com.videomanager.common.NotFoundException;
import com.videomanager.common.RedisJsonCache;
import com.videomanager.config.AppProperties;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class Aish123ServiceImpl implements Aish123Service {

    private static final List<String> TIMESTAMP_KEYS = List.of(
        "createdAt", "lastReplyAt", "firstSeenAt", "updatedAt"
    );
    private static final TypeReference<Map<String, Object>> PAGE_TYPE = new TypeReference<>() {};
    private static final TypeReference<Map<String, Object>> ROW_TYPE = new TypeReference<>() {};

    private final Aish123Mapper aish123Mapper;
    private final RedisJsonCache redisJsonCache;
    private final AppProperties appProperties;

    public Aish123ServiceImpl(
        Aish123Mapper aish123Mapper,
        RedisJsonCache redisJsonCache,
        AppProperties appProperties
    ) {
        this.aish123Mapper = aish123Mapper;
        this.redisJsonCache = redisJsonCache;
        this.appProperties = appProperties;
    }

    @Override
    public Map<String, Object> findAll(QueryAish123Dto dto) {
        String keyPart = CacheKeys.parts(
            "list",
            dto.skip(),
            dto.take(),
            dto.fid(),
            dto.typeName(),
            dto.search(),
            dto.sortBy(),
            dto.sortOrder()
        );
        return redisJsonCache.getOrLoad(
            CacheNamespaces.AISH123,
            keyPart,
            PAGE_TYPE,
            appProperties.cacheTtl(),
            () -> loadPage(dto)
        );
    }

    @Override
    public Map<String, Object> countByTypeName() {
        return redisJsonCache.getOrLoad(
            CacheNamespaces.AISH123,
            "stats:by-type",
            PAGE_TYPE,
            appProperties.cacheTtl(),
            this::loadCountByTypeName
        );
    }

    @Override
    public Map<String, Object> findOne(int tid) {
        return redisJsonCache.getOrLoad(
            CacheNamespaces.AISH123,
            CacheKeys.parts("one", tid),
            ROW_TYPE,
            appProperties.cacheTtl(),
            () -> loadOne(tid)
        );
    }

    private Map<String, Object> loadPage(QueryAish123Dto dto) {
        int skip = dto.skip() == null ? 0 : Math.max(dto.skip(), 0);
        int take = dto.take() == null ? 50 : Math.min(Math.max(dto.take(), 1), 200);

        boolean typeNameNone = dto.typeName() != null && "__NONE__".equals(dto.typeName().trim());
        String typeName = typeNameNone ? null : (dto.typeName() == null ? null : dto.typeName().trim());

        String search = null;
        if (dto.search() != null && !dto.search().isBlank()) {
            search = "%" + dto.search().trim() + "%";
        }

        String orderBy = buildOrderBy(dto.sortBy(), dto.sortOrder());
        Aish123PageQuery query = new Aish123PageQuery(
            dto.fid(),
            typeName,
            typeNameNone,
            search,
            orderBy,
            skip,
            take
        );

        List<Map<String, Object>> items = aish123Mapper.selectPage(query);
        for (Map<String, Object> row : items) {
            normalizeRow(row);
        }
        long total = aish123Mapper.countPage(query);

        Map<String, Object> result = new HashMap<>();
        result.put("items", items);
        result.put("total", total);
        result.put("skip", skip);
        result.put("take", take);
        return result;
    }

    private Map<String, Object> loadCountByTypeName() {
        Long total = aish123Mapper.countAll();
        List<Map<String, Object>> raw = aish123Mapper.selectCountByTypeName();
        List<Map<String, Object>> items = new ArrayList<>();
        for (Map<String, Object> row : raw) {
            Map<String, Object> mapped = new HashMap<>();
            mapped.put("typeName", row.get("typeName"));
            Object cnt = row.get("cnt");
            mapped.put("count", cnt instanceof Number n ? n.longValue() : cnt);
            items.add(mapped);
        }
        Map<String, Object> result = new HashMap<>();
        result.put("total", total == null ? 0L : total);
        result.put("items", items);
        return result;
    }

    private Map<String, Object> loadOne(int tid) {
        Map<String, Object> row = aish123Mapper.selectByTid(tid);
        if (row == null || row.isEmpty()) {
            throw new NotFoundException("aish123 thread " + tid + " not found");
        }
        normalizeRow(row);
        return row;
    }

    private void normalizeRow(Map<String, Object> row) {
        for (String key : TIMESTAMP_KEYS) {
            Object v = row.get(key);
            if (v instanceof Timestamp ts) {
                row.put(key, ts.toInstant());
            }
        }
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

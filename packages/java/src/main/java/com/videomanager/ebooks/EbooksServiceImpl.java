package com.videomanager.ebooks;

import com.fasterxml.jackson.core.type.TypeReference;
import com.videomanager.common.CacheKeys;
import com.videomanager.common.CacheNamespaces;
import com.videomanager.common.NotFoundException;
import com.videomanager.common.RedisJsonCache;
import com.videomanager.config.AppProperties;
import com.videomanager.ebooks.dto.CreateEbookDto;
import com.videomanager.ebooks.dto.QueryEbooksDto;
import com.videomanager.ebooks.dto.UpdateEbookDto;
import java.sql.Timestamp;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EbooksServiceImpl implements EbooksService {

    private static final List<String> TIMESTAMP_KEYS = List.of("created_at", "modified_at");
    private static final TypeReference<Map<String, Object>> PAGE_TYPE = new TypeReference<>() {};
    private static final TypeReference<Map<String, Object>> ROW_TYPE = new TypeReference<>() {};

    private final EbookMapper ebookMapper;
    private final RedisJsonCache redisJsonCache;
    private final AppProperties appProperties;

    public EbooksServiceImpl(
        EbookMapper ebookMapper,
        RedisJsonCache redisJsonCache,
        AppProperties appProperties
    ) {
        this.ebookMapper = ebookMapper;
        this.redisJsonCache = redisJsonCache;
        this.appProperties = appProperties;
    }

    @Override
    public Map<String, Object> findAll(QueryEbooksDto dto) {
        String keyPart = CacheKeys.parts(
            "list",
            dto.skip(),
            dto.take(),
            dto.search(),
            dto.sortBy(),
            dto.sortOrder()
        );
        return redisJsonCache.getOrLoad(
            CacheNamespaces.EBOOKS,
            keyPart,
            PAGE_TYPE,
            appProperties.cacheTtl(),
            () -> loadPage(dto)
        );
    }

    @Override
    public Map<String, Object> findOne(int id) {
        return redisJsonCache.getOrLoad(
            CacheNamespaces.EBOOKS,
            CacheKeys.parts("one", id),
            ROW_TYPE,
            appProperties.cacheTtl(),
            () -> loadOne(id)
        );
    }

    @Override
    @Transactional
    public Map<String, Object> create(CreateEbookDto dto) {
        int affected = ebookMapper.insertEbook(
            dto.title(),
            dto.author(),
            dto.filePath(),
            dto.format(),
            dto.sizeBytes()
        );
        redisJsonCache.invalidateNamespace(CacheNamespaces.EBOOKS);
        return Map.of("affected", affected, "raw", List.of());
    }

    @Override
    @Transactional
    public Map<String, Object> update(int id, UpdateEbookDto dto) {
        Map<String, Object> existing = ebookMapper.selectById(id);
        if (existing == null || existing.isEmpty()) {
            throw new NotFoundException("Ebook " + id + " not found");
        }
        int affected = ebookMapper.updateEbook(
            id,
            dto.title(),
            dto.author(),
            dto.filePath(),
            dto.format(),
            dto.sizeBytes()
        );
        redisJsonCache.invalidateNamespace(CacheNamespaces.EBOOKS);
        return Map.of("affected", affected, "raw", List.of());
    }

    @Override
    @Transactional
    public Map<String, Object> delete(int id) {
        Map<String, Object> existing = ebookMapper.selectById(id);
        if (existing == null || existing.isEmpty()) {
            throw new NotFoundException("Ebook " + id + " not found");
        }
        int affected = ebookMapper.deleteById(id);
        redisJsonCache.invalidateNamespace(CacheNamespaces.EBOOKS);
        return Map.of("affected", affected, "raw", List.of());
    }

    private Map<String, Object> loadPage(QueryEbooksDto dto) {
        int skip = dto.skip() == null ? 0 : Math.max(dto.skip(), 0);
        int take = dto.take() == null ? 50 : Math.min(Math.max(dto.take(), 1), 200);

        String search = null;
        if (dto.search() != null && !dto.search().isBlank()) {
            search = "%" + dto.search().trim() + "%";
        }

        String orderBy = buildOrderBy(dto.sortBy(), dto.sortOrder());
        EbookPageQuery query = new EbookPageQuery(search, orderBy, skip, take);

        List<Map<String, Object>> items = ebookMapper.selectPage(query);
        for (Map<String, Object> row : items) {
            normalizeRow(row);
        }
        long total = ebookMapper.countPage(query);

        Map<String, Object> result = new HashMap<>();
        result.put("items", items);
        result.put("total", total);
        result.put("skip", skip);
        result.put("take", take);
        return result;
    }

    private Map<String, Object> loadOne(int id) {
        Map<String, Object> row = ebookMapper.selectById(id);
        if (row == null || row.isEmpty()) {
            throw new NotFoundException("Ebook " + id + " not found");
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
        String field = sortBy == null || sortBy.isBlank() ? "modified_at" : sortBy;
        Map<String, String> columnMap = Map.ofEntries(
            Map.entry("id", "e.id"),
            Map.entry("title", "e.title"),
            Map.entry("author", "e.author"),
            Map.entry("file_path", "e.file_path"),
            Map.entry("format", "e.format"),
            Map.entry("size_bytes", "e.size_bytes"),
            Map.entry("created_at", "e.created_at"),
            Map.entry("modified_at", "e.modified_at")
        );
        String col = columnMap.getOrDefault(field, "e.modified_at");
        return " ORDER BY " + col + " " + direction + ", e.id " + direction;
    }
}

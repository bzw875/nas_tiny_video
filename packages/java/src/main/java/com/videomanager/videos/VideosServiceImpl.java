package com.videomanager.videos;

import com.videomanager.common.NotFoundException;
import com.videomanager.videos.dto.QueryVideosDto;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VideosServiceImpl implements VideosService {
    private static final Set<String> ALLOWED_VIDEO_EXTENSIONS = Set.of(
        ".mp4", ".avi", ".mkv", ".mov", ".flv", ".wmv", ".webm", ".m4v", ".3gp",
        ".ogv", ".ts", ".m2ts", ".mts", ".vob", ".f4v", ".asf", ".rm", ".rmvb",
        ".divx", ".dv", ".m2v", ".mxf", ".ogg", ".qt", ".yuv", ".y4m", ".h264",
        ".h265", ".hevc"
    );

    private final JdbcTemplate jdbcTemplate;

    public VideosServiceImpl(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Map<String, Object> findAll(QueryVideosDto dto) {
        int skip = dto.skip() == null ? 0 : Math.max(dto.skip(), 0);
        int take = dto.take() == null ? 50 : Math.min(Math.max(dto.take(), 1), 200);
        List<Integer> tagIds = parseTagIds(dto.tagIds());
        List<String> extList = parseExtensionsFilter(dto.extensions());

        StringBuilder where = new StringBuilder(" FROM videos v WHERE 1=1");
        List<Object> args = new ArrayList<>();

        if (dto.pathPrefix() != null && !dto.pathPrefix().isBlank()) {
            where.append(" AND v.path LIKE ?");
            args.add(dto.pathPrefix() + "%");
        }
        if (dto.search() != null && !dto.search().isBlank()) {
            where.append(" AND (v.filename LIKE ? OR v.path LIKE ?)");
            String search = "%" + dto.search().trim() + "%";
            args.add(search);
            args.add(search);
        }
        if (!tagIds.isEmpty()) {
            for (Integer tagId : tagIds) {
                where.append(" AND EXISTS (SELECT 1 FROM video_tags vt WHERE vt.video_id = v.id AND vt.tag_id = ?)");
                args.add(tagId);
            }
        }
        if (!extList.isEmpty()) {
            where.append(" AND v.extension IN (");
            where.append(extList.stream().map(it -> "?").collect(Collectors.joining(",")));
            where.append(")");
            args.addAll(extList);
        }

        String orderBy = buildOrderBy(dto.sortBy(), dto.sortOrder());
        List<Object> listArgs = new ArrayList<>(args);
        listArgs.add(skip);
        listArgs.add(take);

        String listSql = "SELECT v.id, v.filename, v.path, v.extension, v.size, v.created_time, v.modified_time, v.video_key"
            + where + orderBy + " LIMIT ?, ?";
        List<Map<String, Object>> items = jdbcTemplate.query(listSql, listArgs.toArray(), videoRowMapper());

        String countSql = "SELECT COUNT(*)" + where;
        Long total = jdbcTemplate.queryForObject(countSql, args.toArray(), Long.class);

        attachTags(items);
        Map<String, Object> result = new HashMap<>();
        result.put("items", items);
        result.put("total", total == null ? 0L : total);
        result.put("skip", skip);
        result.put("take", take);
        return result;
    }

    @Override
    public Map<String, Object> findOne(int id) {
        String sql = "SELECT id, filename, path, extension, size, created_time, modified_time, video_key FROM videos WHERE id = ?";
        List<Map<String, Object>> rows = jdbcTemplate.query(sql, videoRowMapper(), id);
        if (rows.isEmpty()) {
            throw new NotFoundException("Video " + id + " not found");
        }
        Map<String, Object> video = rows.get(0);
        attachTags(List.of(video));
        return video;
    }

    @Override
    @Transactional
    public Map<String, Object> updateTags(int id, List<Integer> tagIds) {
        findOne(id);
        jdbcTemplate.update("DELETE FROM video_tags WHERE video_id = ?", id);
        List<Integer> normalized = tagIds == null ? List.of() : tagIds.stream().filter(it -> it != null).distinct().toList();
        for (Integer tagId : normalized) {
            jdbcTemplate.update("INSERT IGNORE INTO video_tags (video_id, tag_id) VALUES (?, ?)", id, tagId);
        }
        return findOne(id);
    }

    @Override
    public Map<String, Object> getFolderListing(String parent) {
        String normalizedParent = normalizeParentPrefix(parent);
        Map<String, Object> result = new HashMap<>();
        result.put("parent", parent == null ? "" : parent);

        if (!normalizedParent.isEmpty()) {
            List<Map<String, Object>> rows = jdbcTemplate.query(
                "SELECT id, filename, path FROM videos WHERE path LIKE ?",
                (rs, rowNum) -> Map.of(
                    "id", rs.getInt("id"),
                    "filename", rs.getString("filename"),
                    "path", rs.getString("path")
                ),
                normalizedParent + "%"
            );
            Map<String, Integer> subfolders = new HashMap<>();
            List<Map<String, Object>> files = new ArrayList<>();
            for (Map<String, Object> row : rows) {
                String path = (String) row.get("path");
                if (path == null || !path.startsWith(normalizedParent)) {
                    continue;
                }
                String rest = path.substring(normalizedParent.length());
                if (rest.isEmpty()) {
                    continue;
                }
                int slash = rest.indexOf('/');
                if (slash < 0) {
                    files.add(row);
                } else {
                    String name = rest.substring(0, slash);
                    if (!name.isEmpty()) {
                        subfolders.put(name, subfolders.getOrDefault(name, 0) + 1);
                    }
                }
            }
            List<Map<String, Object>> folderList = subfolders.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> {
                    Map<String, Object> folder = new HashMap<>();
                    folder.put("name", entry.getKey());
                    folder.put("videoCount", entry.getValue());
                    return folder;
                })
                .toList();
            result.put("subfolders", folderList);
            result.put("files", files);
            return result;
        }

        List<Map<String, Object>> subfolders = jdbcTemplate.query(
            """
            SELECT SUBSTRING_INDEX(TRIM(BOTH '/' FROM path), '/', 1) AS name, COUNT(*) AS videoCount
            FROM videos
            WHERE path IS NOT NULL AND LOCATE('/', TRIM(BOTH '/' FROM path)) > 0
            GROUP BY name
            HAVING name <> ''
            ORDER BY name
            """,
            (rs, rowNum) -> Map.of("name", rs.getString("name"), "videoCount", rs.getInt("videoCount"))
        );
        List<Map<String, Object>> files = jdbcTemplate.query(
            """
            SELECT id, filename, path
            FROM videos
            WHERE path IS NOT NULL AND LOCATE('/', TRIM(BOTH '/' FROM path)) = 0
            ORDER BY id ASC
            """,
            (rs, rowNum) -> Map.of("id", rs.getInt("id"), "filename", rs.getString("filename"), "path", rs.getString("path"))
        );
        result.put("subfolders", subfolders);
        result.put("files", files);
        return result;
    }

    private void attachTags(List<Map<String, Object>> videos) {
        if (videos.isEmpty()) {
            return;
        }
        List<Integer> ids = videos.stream()
            .map(v -> (Integer) v.get("id"))
            .toList();
        String placeholders = ids.stream().map(it -> "?").collect(Collectors.joining(","));
        String sql = "SELECT vt.video_id, t.id AS tag_id, t.name AS tag_name "
            + "FROM video_tags vt JOIN tags t ON t.id = vt.tag_id WHERE vt.video_id IN (" + placeholders + ")";
        List<Map<String, Object>> tagRows = jdbcTemplate.query(sql, (rs, rowNum) -> {
            Map<String, Object> row = new HashMap<>();
            row.put("videoId", rs.getInt("video_id"));
            row.put("id", rs.getInt("tag_id"));
            row.put("name", rs.getString("tag_name"));
            return row;
        }, ids.toArray());

        Map<Integer, List<Map<String, Object>>> grouped = new HashMap<>();
        for (Map<String, Object> row : tagRows) {
            Integer videoId = (Integer) row.get("videoId");
            grouped.computeIfAbsent(videoId, it -> new ArrayList<>())
                .add(Map.of("id", row.get("id"), "name", row.get("name")));
        }
        for (Map<String, Object> video : videos) {
            Integer id = (Integer) video.get("id");
            video.put("tags", grouped.getOrDefault(id, List.of()));
        }
    }

    private RowMapper<Map<String, Object>> videoRowMapper() {
        return (rs, rowNum) -> {
            Map<String, Object> video = new HashMap<>();
            video.put("id", rs.getInt("id"));
            video.put("filename", rs.getString("filename"));
            video.put("path", rs.getString("path"));
            video.put("extension", rs.getString("extension"));
            Object size = rs.getObject("size");
            video.put("size", size == null ? null : String.valueOf(size));
            Timestamp createdTime = rs.getTimestamp("created_time");
            Timestamp modifiedTime = rs.getTimestamp("modified_time");
            video.put("createdTime", createdTime == null ? null : createdTime.toLocalDateTime());
            video.put("modifiedTime", modifiedTime == null ? null : modifiedTime.toLocalDateTime());
            video.put("videoKey", rs.getString("video_key"));
            return video;
        };
    }

    private String buildOrderBy(String sortBy, String sortOrder) {
        String direction = "asc".equalsIgnoreCase(sortOrder) ? "ASC" : "DESC";
        String field = sortBy == null || sortBy.isBlank() ? "modifiedTime" : sortBy;
        if ("tags".equals(field)) {
            return " ORDER BY (SELECT COUNT(*) FROM video_tags vt WHERE vt.video_id = v.id) " + direction + ", v.id " + direction;
        }
        Map<String, String> columnMap = Map.of(
            "id", "v.id",
            "filename", "v.filename",
            "path", "v.path",
            "extension", "v.extension",
            "size", "v.size",
            "createdTime", "v.created_time",
            "modifiedTime", "v.modified_time",
            "videoKey", "v.video_key"
        );
        return " ORDER BY " + columnMap.getOrDefault(field, "v.modified_time") + " " + direction + ", v.id " + direction;
    }

    private List<Integer> parseTagIds(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        List<Integer> ids = new ArrayList<>();
        for (String part : raw.split(",")) {
            try {
                ids.add(Integer.parseInt(part.trim()));
            } catch (NumberFormatException ignored) {
                // ignore invalid ids
            }
        }
        return ids;
    }

    private List<String> parseExtensionsFilter(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        Set<String> normalized = new HashSet<>();
        for (String part : raw.split(",")) {
            String ext = normalizeVideoExtension(part);
            if (ext != null) {
                normalized.add(ext);
            }
        }
        return List.copyOf(normalized);
    }

    private String normalizeVideoExtension(String raw) {
        String value = raw == null ? "" : raw.trim().toLowerCase();
        if (value.isEmpty()) {
            return null;
        }
        String withDot = value.startsWith(".") ? value : "." + value;
        return ALLOWED_VIDEO_EXTENSIONS.contains(withDot) ? withDot : null;
    }

    private String normalizeParentPrefix(String parent) {
        String value = parent == null ? "" : parent;
        if (value.isEmpty()) {
            return "";
        }
        return value.endsWith("/") ? value : value + "/";
    }
}

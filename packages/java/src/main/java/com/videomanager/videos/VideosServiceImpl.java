package com.videomanager.videos;

import com.videomanager.common.NotFoundException;
import com.videomanager.videos.dto.QueryVideosDto;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
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

    private final VideoMapper videoMapper;

    public VideosServiceImpl(VideoMapper videoMapper) {
        this.videoMapper = videoMapper;
    }

    @Override
    public Map<String, Object> findAll(QueryVideosDto dto) {
        int skip = dto.skip() == null ? 0 : Math.max(dto.skip(), 0);
        int take = dto.take() == null ? 50 : Math.min(Math.max(dto.take(), 1), 200);
        List<Integer> tagIds = parseTagIds(dto.tagIds());
        List<String> extList = parseExtensionsFilter(dto.extensions());

        String pathPrefix = null;
        if (dto.pathPrefix() != null && !dto.pathPrefix().isBlank()) {
            pathPrefix = dto.pathPrefix() + "%";
        }
        String search = null;
        if (dto.search() != null && !dto.search().isBlank()) {
            search = "%" + dto.search().trim() + "%";
        }

        String orderBy = buildOrderBy(dto.sortBy(), dto.sortOrder());
        VideoPageQuery query = new VideoPageQuery(pathPrefix, search, tagIds, extList, orderBy, skip, take);

        List<Map<String, Object>> items = videoMapper.selectVideoPage(query);
        long total = videoMapper.countVideos(query);

        attachTags(items);
        Map<String, Object> result = new HashMap<>();
        result.put("items", items);
        result.put("total", total);
        result.put("skip", skip);
        result.put("take", take);
        return result;
    }

    @Override
    public Map<String, Object> findOne(int id) {
        Map<String, Object> video = videoMapper.selectVideoById(id);
        if (video == null || video.isEmpty()) {
            throw new NotFoundException("Video " + id + " not found");
        }
        attachTags(List.of(video));
        return video;
    }

    @Override
    @Transactional
    public Map<String, Object> updateTags(int id, List<Integer> tagIds) {
        findOne(id);
        videoMapper.deleteVideoTags(id);
        List<Integer> normalized = tagIds == null ? List.of() : tagIds.stream().filter(it -> it != null).distinct().toList();
        for (Integer tagId : normalized) {
            videoMapper.insertVideoTag(id, tagId);
        }
        return findOne(id);
    }

    @Override
    public Map<String, Object> getFolderListing(String parent) {
        String normalizedParent = normalizeParentPrefix(parent);
        Map<String, Object> result = new HashMap<>();
        result.put("parent", parent == null ? "" : parent);

        if (!normalizedParent.isEmpty()) {
            List<Map<String, Object>> rows = videoMapper.selectVideosForFolder(normalizedParent + "%");
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

        List<Map<String, Object>> subfolders = videoMapper.selectRootFolderSubfolders();
        List<Map<String, Object>> files = videoMapper.selectRootFolderFiles();
        result.put("subfolders", subfolders);
        result.put("files", files);
        return result;
    }

    private void attachTags(List<Map<String, Object>> videos) {
        if (videos.isEmpty()) {
            return;
        }
        List<Integer> ids = videos.stream()
            .map(v -> ((Number) v.get("id")).intValue())
            .toList();
        List<Map<String, Object>> tagRows = videoMapper.selectTagsForVideoIds(ids);

        Map<Integer, List<Map<String, Object>>> grouped = new HashMap<>();
        for (Map<String, Object> row : tagRows) {
            Integer videoId = ((Number) row.get("videoId")).intValue();
            grouped.computeIfAbsent(videoId, it -> new ArrayList<>())
                .add(Map.of("id", row.get("id"), "name", row.get("name")));
        }
        for (Map<String, Object> video : videos) {
            Integer id = ((Number) video.get("id")).intValue();
            video.put("tags", grouped.getOrDefault(id, List.of()));
        }
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

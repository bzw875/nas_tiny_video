package com.videomanager.videos;

import java.util.List;

/**
 * Parameters for paginated video listing and count (count ignores orderBySql, skip, take).
 */
public record VideoPageQuery(
    String pathPrefix,
    String search,
    List<Integer> tagIds,
    List<String> extensions,
    String orderBySql,
    Integer skip,
    Integer take
) {
    public VideoPageQuery {
        tagIds = tagIds == null ? List.of() : tagIds;
        extensions = extensions == null ? List.of() : extensions;
    }
}

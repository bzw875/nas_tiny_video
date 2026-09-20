package com.videomanager.tasks;


/**
 * Parameters for paginated task listing and count (count ignores orderBy, skip, take).
 */
public record TaskPageQuery(
    String search,
    String orderBy,
    Integer skip,
    Integer take
) {
}

package com.videomanager.videos.dto;

import jakarta.validation.constraints.Min;

public record QueryVideosDto(
    @Min(0) Integer skip,
    @Min(1) Integer take,
    String tagIds,
    String pathPrefix,
    String search,
    String sortBy,
    String sortOrder,
    String extensions
) {
}

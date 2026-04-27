package com.videomanager.novels.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record UpdateNovelStarDto(
    @Min(0) @Max(5) Integer starRating
) {
}

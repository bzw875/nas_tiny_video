package com.videomanager.gallery.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record QueryGalleryDto(
    @Min(0) Integer skip,
    @Min(1) @Max(200) Integer take,
    String sortBy,
    String sortOrder
) {
}

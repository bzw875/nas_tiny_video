package com.videomanager.aish123.dto;

import jakarta.validation.constraints.Min;

public record QueryAish123Dto(
    @Min(0) Integer skip,
    @Min(1) Integer take,
    Integer fid,
    String typeName,
    String search,
    String sortBy,
    String sortOrder
) {
}

package com.videomanager.tasks.dto;

import jakarta.validation.constraints.Min;

public record QueryTasksDto(
    @Min(0) Integer skip,
    @Min(1) Integer take,
    String search,
    String sortBy,
    String sortOrder
) {
}

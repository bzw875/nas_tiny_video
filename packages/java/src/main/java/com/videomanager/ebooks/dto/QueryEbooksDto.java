package com.videomanager.ebooks.dto;

import jakarta.validation.constraints.Min;

public record QueryEbooksDto(
    @Min(0) Integer skip,
    @Min(1) Integer take,
    String search,
    String sortBy,
    String sortOrder
) {
}

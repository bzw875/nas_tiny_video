package com.videomanager.tags.dto;

import jakarta.validation.constraints.Size;

public record UpdateTagDto(
    @Size(min = 1, max = 100) String name,
    String description
) {
}

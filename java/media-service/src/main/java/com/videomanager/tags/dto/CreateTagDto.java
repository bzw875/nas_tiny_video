package com.videomanager.tags.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateTagDto(
    @NotBlank @Size(max = 100) String name,
    String description
) {
}

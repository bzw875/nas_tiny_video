package com.videomanager.tags.dto;

import java.time.LocalDateTime;

public record TagDto(
    Integer id,
    String name,
    String description,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}

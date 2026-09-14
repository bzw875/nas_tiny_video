package com.videomanager.ebooks.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record UpdateEbookDto(
    @NotBlank String title,
    @NotBlank String author,
    @NotBlank String filePath,
    @NotBlank String format,
    @NotNull @PositiveOrZero Long sizeBytes
) {
}

package com.videomanager.treehole.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * 树洞列表查询参数，语义与 treeholeSelf 的
 * {@code /api/treehole?page=0&size=20&field=date_gmt&sort=DESC&likeRange=101-200} 保持一致。
 */
public record QueryTreeholeDto(
    @Min(0) Integer page,
    @Min(1) @Max(100) Integer size,
    String field,
    String sort,
    String likeRange
) {
}

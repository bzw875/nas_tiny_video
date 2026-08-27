package com.videomanager.aish123;

/**
 * Dynamic list/count for aish123. {@code typeNameNone} means filter empty type_name (__NONE__).
 */
public record Aish123PageQuery(
    Integer fid,
    String typeName,
    boolean typeNameNone,
    String search,
    String orderBySql,
    int skip,
    int take
) {
}

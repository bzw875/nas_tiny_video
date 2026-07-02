package com.videomanager.ebooks;

public record EbookPageQuery(
    String search,
    String orderBySql,
    int skip,
    int take
) {
}

package com.videomanager.aish123;

import com.videomanager.aish123.dto.QueryAish123Dto;
import java.util.Map;

public interface Aish123Service {
    Map<String, Object> findAll(QueryAish123Dto dto);

    Map<String, Object> findOne(int tid);

    /** Counts grouped by {@code type_name} (district / category). */
    Map<String, Object> countByTypeName();
}

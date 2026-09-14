package com.videomanager.tasks;

import com.fasterxml.jackson.core.type.TypeReference;
import com.videomanager.common.CacheKeys;
import com.videomanager.common.CacheNamespaces;
import com.videomanager.common.NotFoundException;
import com.videomanager.common.RedisJsonCache;
import com.videomanager.config.AppProperties;
import com.videomanager.tasks.dto.QueryTasksDto;

import jakarta.validation.constraints.Min;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TasksServiceImpl implements TasksService {

  private final RedisJsonCache redisJsonCache;
  private final TaskMapper taskMapper;
  private static final TypeReference<Map<String, Object>> PAGE_TYPE = new TypeReference<>() {};
  private final AppProperties appProperties;

  public  TasksServiceImpl(
    TaskMapper taskMapper,
    RedisJsonCache redisJsonCache,
    AppProperties appProperties
  ) {
    this.taskMapper = taskMapper;
    this.redisJsonCache = redisJsonCache;
    this.appProperties = appProperties;
  }

  @Override
  public Map<String, Object> findAll(QueryTasksDto dto) {
    String keyPart = CacheKeys.parts(
      dto.skip(),
      dto.take(),
      dto.search(),
      dto.sortBy(),
      dto.sortOrder()
    );

    return redisJsonCache.getOrLoad(
      CacheNamespaces.TASKS,
      keyPart,
      PAGE_TYPE,
      appProperties.cacheTtl(),
      () -> loadPage(dto)
    );
  }

  private Map<String, Object> loadPage(QueryTasksDto dto) {
    int skip = dto.skip() != null ? dto.skip() : 0;
    int take = dto.take() != null ? dto.take() : 10;

    String serach = null;
    if (dto.search() != null && !dto.search().isBlank()) {
      serach = "%" + dto.search().trim() + "%";
    }
    String orderBy = buildOrderBy(dto.sortBy(), dto.sortOrder());
    TaskPageQuery query = new TaskPageQuery(serach, orderBy, null, null);

    List<Map<String, Object>> items = taskMapper.selectTaskPage(query);
    long total = taskMapper.countTasks(query);

    
    Map<String, Object> result = new HashMap<>();
    result.put("items", items);
    result.put("total", total);
    result.put("skip", skip);
    result.put("take", take);
    return result;
  }

  private String buildOrderBy(String sortBy, String sortOrder) {
    String direction = "asc".equalsIgnoreCase(sortOrder) ? "ASC" : "DESC";
    String field = sortBy == null || sortBy.isBlank() ? "modifiedTime" : sortBy;
    Map<String, String> columnMap = Map.of(
      "id", "v.id"
    );
    return " ORDER BY " + columnMap.getOrDefault(field, "v.modified_time") + " " + direction + ", v.id" + direction;
  }


}
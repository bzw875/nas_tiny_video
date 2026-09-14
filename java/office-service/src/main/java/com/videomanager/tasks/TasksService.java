package com.videomanager.tasks;

import com.videomanager.tasks.dto.QueryTasksDto;
import java.util.List;
import java.util.Map;

public interface TasksService {
    Map<String, Object> findAll(QueryTasksDto dto);
}

package com.videomanager.tasks;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface TaskMapper {

    List<Map<String, Object>> selectTaskPage(TaskPageQuery query);

    long countTasks(TaskPageQuery query);
}

package com.videomanager.aish123;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface Aish123Mapper {

    List<Map<String, Object>> selectPage(Aish123PageQuery query);

    long countPage(Aish123PageQuery query);

    Long countAll();

    List<Map<String, Object>> selectCountByTypeName();

    Map<String, Object> selectByTid(@Param("tid") int tid);
}

package com.videomanager.tags;

import com.videomanager.tags.dto.TagDto;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface TagsMapper {

    List<TagDto> findAll();

    List<TagDto> findById(@Param("id") int id);

    int insert(TagInsert row);

    int update(
        @Param("id") int id,
        @Param("name") String name,
        @Param("description") String description
    );

    int deleteById(@Param("id") int id);
}

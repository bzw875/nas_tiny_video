package com.videomanager.tags;

import com.videomanager.tags.dto.CreateTagDto;
import com.videomanager.tags.dto.TagDto;
import com.videomanager.tags.dto.UpdateTagDto;
import java.util.List;

public interface TagsService {
    List<TagDto> findAll();
    TagDto findOne(int id);
    TagDto create(CreateTagDto dto);
    TagDto update(int id, UpdateTagDto dto);
    Object remove(int id);
}

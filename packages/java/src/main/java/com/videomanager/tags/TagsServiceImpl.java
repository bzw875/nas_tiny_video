package com.videomanager.tags;

import com.videomanager.tags.dto.CreateTagDto;
import com.videomanager.tags.dto.TagDto;
import com.videomanager.tags.dto.UpdateTagDto;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class TagsServiceImpl implements TagsService {

    @Override
    public List<TagDto> findAll() {
        throw new UnsupportedOperationException("TODO: implement with MyBatis-Plus mapper");
    }

    @Override
    public TagDto findOne(int id) {
        throw new UnsupportedOperationException("TODO: implement with MyBatis-Plus mapper");
    }

    @Override
    public TagDto create(CreateTagDto dto) {
        throw new UnsupportedOperationException("TODO: implement with MyBatis-Plus mapper");
    }

    @Override
    public TagDto update(int id, UpdateTagDto dto) {
        throw new UnsupportedOperationException("TODO: implement with MyBatis-Plus mapper");
    }

    @Override
    public Object remove(int id) {
        return Map.of("ok", true);
    }
}

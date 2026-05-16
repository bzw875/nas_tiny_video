package com.videomanager.tags;

import com.videomanager.common.NotFoundException;
import com.videomanager.tags.dto.CreateTagDto;
import com.videomanager.tags.dto.TagDto;
import com.videomanager.tags.dto.UpdateTagDto;
import java.util.List;
import java.util.Map;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

@Service
public class TagsServiceImpl implements TagsService {
    private final TagsMapper tagsMapper;

    public TagsServiceImpl(TagsMapper tagsMapper) {
        this.tagsMapper = tagsMapper;
    }

    @Override
    public List<TagDto> findAll() {
        return tagsMapper.findAll();
    }

    @Override
    public TagDto findOne(int id) {
        List<TagDto> tags = tagsMapper.findById(id);
        if (tags.isEmpty()) {
            throw new NotFoundException("Tag " + id + " not found");
        }
        return tags.get(0);
    }

    @Override
    public TagDto create(CreateTagDto dto) {
        String name = dto.name().trim();
        String description = dto.description() == null ? null : dto.description().trim();
        if (description != null && description.isEmpty()) {
            description = null;
        }
        TagInsert row = new TagInsert();
        row.setName(name);
        row.setDescription(description);
        try {
            tagsMapper.insert(row);
        } catch (DuplicateKeyException ex) {
            throw new DuplicateKeyException("Tag name already exists");
        }
        Integer id = row.getId();
        if (id == null) {
            throw new IllegalStateException("Failed to resolve created tag id");
        }
        return findOne(id);
    }

    @Override
    public TagDto update(int id, UpdateTagDto dto) {
        TagDto current = findOne(id);
        String name = dto.name() == null ? current.name() : dto.name().trim();
        String description = current.description();
        if (dto.description() != null) {
            String d = dto.description().trim();
            description = d.isEmpty() ? null : d;
        }
        try {
            tagsMapper.update(id, name, description);
        } catch (DuplicateKeyException ex) {
            throw new DuplicateKeyException("Tag name already exists");
        }
        return findOne(id);
    }

    @Override
    public Object remove(int id) {
        findOne(id);
        tagsMapper.deleteById(id);
        return Map.of("ok", true);
    }
}

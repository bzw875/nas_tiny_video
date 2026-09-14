package com.videomanager.tags;

import com.fasterxml.jackson.core.type.TypeReference;
import com.videomanager.common.CacheKeys;
import com.videomanager.common.CacheNamespaces;
import com.videomanager.common.NotFoundException;
import com.videomanager.common.RedisJsonCache;
import com.videomanager.config.AppProperties;
import com.videomanager.tags.dto.CreateTagDto;
import com.videomanager.tags.dto.TagDto;
import com.videomanager.tags.dto.UpdateTagDto;
import java.util.List;
import java.util.Map;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

@Service
public class TagsServiceImpl implements TagsService {

    private static final TypeReference<List<TagDto>> TAG_LIST_TYPE = new TypeReference<>() {};
    private static final TypeReference<TagDto> TAG_TYPE = new TypeReference<>() {};

    private final TagsMapper tagsMapper;
    private final RedisJsonCache redisJsonCache;
    private final AppProperties appProperties;

    public TagsServiceImpl(
        TagsMapper tagsMapper,
        RedisJsonCache redisJsonCache,
        AppProperties appProperties
    ) {
        this.tagsMapper = tagsMapper;
        this.redisJsonCache = redisJsonCache;
        this.appProperties = appProperties;
    }

    @Override
    public List<TagDto> findAll() {
        return redisJsonCache.getOrLoad(
            CacheNamespaces.TAGS,
            "all",
            TAG_LIST_TYPE,
            appProperties.cacheTtl(),
            tagsMapper::findAll
        );
    }

    @Override
    public TagDto findOne(int id) {
        return redisJsonCache.getOrLoad(
            CacheNamespaces.TAGS,
            CacheKeys.parts("one", id),
            TAG_TYPE,
            appProperties.cacheTtl(),
            () -> loadOne(id)
        );
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
        invalidateTagsAndVideos();
        return loadOne(id);
    }

    @Override
    public TagDto update(int id, UpdateTagDto dto) {
        TagDto current = loadOne(id);
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
        invalidateTagsAndVideos();
        return loadOne(id);
    }

    @Override
    public Object remove(int id) {
        loadOne(id);
        tagsMapper.deleteById(id);
        invalidateTagsAndVideos();
        return Map.of("ok", true);
    }

    private TagDto loadOne(int id) {
        List<TagDto> tags = tagsMapper.findById(id);
        if (tags.isEmpty()) {
            throw new NotFoundException("Tag " + id + " not found");
        }
        return tags.get(0);
    }

    private void invalidateTagsAndVideos() {
        redisJsonCache.invalidateNamespace(CacheNamespaces.TAGS);
        redisJsonCache.invalidateNamespace(CacheNamespaces.VIDEOS);
    }
}

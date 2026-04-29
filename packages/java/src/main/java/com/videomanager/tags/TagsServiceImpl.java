package com.videomanager.tags;

import com.videomanager.common.NotFoundException;
import com.videomanager.tags.dto.CreateTagDto;
import com.videomanager.tags.dto.TagDto;
import com.videomanager.tags.dto.UpdateTagDto;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

@Service
public class TagsServiceImpl implements TagsService {
    private final JdbcTemplate jdbcTemplate;

    public TagsServiceImpl(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<TagDto> findAll() {
        return jdbcTemplate.query(
            "SELECT id, name, description, created_at, updated_at FROM tags ORDER BY name ASC",
            tagRowMapper()
        );
    }

    @Override
    public TagDto findOne(int id) {
        List<TagDto> tags = jdbcTemplate.query(
            "SELECT id, name, description, created_at, updated_at FROM tags WHERE id = ?",
            tagRowMapper(),
            id
        );
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
        try {
            jdbcTemplate.update(
                "INSERT INTO tags (name, description) VALUES (?, ?)",
                name,
                description
            );
        } catch (DuplicateKeyException ex) {
            throw new DuplicateKeyException("Tag name already exists");
        }
        Integer id = jdbcTemplate.queryForObject("SELECT id FROM tags WHERE name = ?", Integer.class, name);
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
            jdbcTemplate.update(
                "UPDATE tags SET name = ?, description = ? WHERE id = ?",
                name,
                description,
                id
            );
        } catch (DuplicateKeyException ex) {
            throw new DuplicateKeyException("Tag name already exists");
        }
        return findOne(id);
    }

    @Override
    public Object remove(int id) {
        findOne(id);
        jdbcTemplate.update("DELETE FROM tags WHERE id = ?", id);
        return Map.of("ok", true);
    }

    private RowMapper<TagDto> tagRowMapper() {
        return (ResultSet rs, int rowNum) -> mapTag(rs);
    }

    private TagDto mapTag(ResultSet rs) throws SQLException {
        return new TagDto(
            rs.getInt("id"),
            rs.getString("name"),
            rs.getString("description"),
            rs.getTimestamp("created_at") == null ? null : rs.getTimestamp("created_at").toLocalDateTime(),
            rs.getTimestamp("updated_at") == null ? null : rs.getTimestamp("updated_at").toLocalDateTime()
        );
    }
}

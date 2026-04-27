package com.videomanager.tags;

import com.videomanager.tags.dto.CreateTagDto;
import com.videomanager.tags.dto.UpdateTagDto;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TagsController {

    private final TagsService tagsService;

    public TagsController(TagsService tagsService) {
        this.tagsService = tagsService;
    }

    @GetMapping("/tags")
    public Object list() {
        return tagsService.findAll();
    }

    @GetMapping("/tags/{id}")
    public Object one(@PathVariable int id) {
        return tagsService.findOne(id);
    }

    @PostMapping("/tags")
    public Object create(@Valid @RequestBody CreateTagDto dto) {
        return tagsService.create(dto);
    }

    @PatchMapping("/tags/{id}")
    public Object update(@PathVariable int id, @Valid @RequestBody UpdateTagDto dto) {
        return tagsService.update(id, dto);
    }

    @DeleteMapping("/tags/{id}")
    public Object remove(@PathVariable int id) {
        return tagsService.remove(id);
    }
}

package com.videomanager.videos;

import com.videomanager.videos.dto.QueryVideosDto;
import com.videomanager.videos.dto.UpdateVideoTagsDto;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class VideosController {

    private final VideosService videosService;

    public VideosController(VideosService videosService) {
        this.videosService = videosService;
    }

    @GetMapping("/videos")
    public Object list(@Valid QueryVideosDto dto) {
        return videosService.findAll(dto);
    }

    @GetMapping("/videos/folders")
    public Object folders(@RequestParam(defaultValue = "") String parent) {
        return videosService.getFolderListing(parent);
    }

    @GetMapping("/videos/{id}")
    public Object one(@PathVariable int id) {
        return videosService.findOne(id);
    }

    @PatchMapping("/videos/{id}/tags")
    public Object patchTags(@PathVariable int id, @RequestBody UpdateVideoTagsDto body) {
        return videosService.updateTags(id, body.tagIds());
    }
}

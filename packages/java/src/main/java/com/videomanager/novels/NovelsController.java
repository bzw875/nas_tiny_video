package com.videomanager.novels;

import com.videomanager.novels.dto.UpdateNovelStarDto;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class NovelsController {

    private final NovelsService novelsService;

    public NovelsController(NovelsService novelsService) {
        this.novelsService = novelsService;
    }

    @GetMapping("/novels")
    public Object getNovels(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "1000") int limit
    ) {
        return novelsService.getNovelsLimit(page, limit);
    }

    @GetMapping("/novelByName/{name}")
    public Object getNovelByName(@PathVariable String name) {
        return novelsService.getNovelByName(name);
    }

    @GetMapping("/novel/{id}")
    public Object getNovel(@PathVariable int id, @RequestParam(required = false) Integer page) {
        return novelsService.getNovelPage(id, page);
    }

    @PostMapping("/novel/{id}")
    public Object updateStarRating(
        @PathVariable int id,
        @Valid @RequestBody UpdateNovelStarDto dto
    ) {
        return novelsService.updateStarRating(id, dto.starRating());
    }

    @GetMapping("/scanning")
    public Object scanning() {
        return novelsService.doScanning();
    }

    @DeleteMapping("/novel/{id}")
    public Object deleteNovel(@PathVariable int id) {
        return novelsService.deleteNovel(id);
    }
}

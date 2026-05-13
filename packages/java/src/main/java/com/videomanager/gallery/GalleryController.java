package com.videomanager.gallery;

import com.videomanager.gallery.dto.QueryGalleryDto;
import jakarta.validation.Valid;
import java.nio.file.Files;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class GalleryController {

    private final GalleryService galleryService;

    public GalleryController(GalleryService galleryService) {
        this.galleryService = galleryService;
    }

    @GetMapping("/gallery")
    public Object list(@Valid QueryGalleryDto dto) {
        return galleryService.list(dto);
    }

    @GetMapping("/gallery/file")
    public ResponseEntity<Resource> file(@RequestParam("name") String name) throws Exception {
        var path = galleryService.resolveReadableFile(name);
        Resource body = new FileSystemResource(path);
        String probe = Files.probeContentType(path);
        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        if (probe != null) {
            try {
                mediaType = MediaType.parseMediaType(probe);
            } catch (Exception ignored) {
                /* keep octet-stream */
            }
        }
        return ResponseEntity.ok()
            .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
            .contentType(mediaType)
            .body(body);
    }
}

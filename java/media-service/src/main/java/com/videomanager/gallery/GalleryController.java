package com.videomanager.gallery;

import com.videomanager.gallery.dto.QueryGalleryDto;
import jakarta.validation.Valid;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Map;
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

    private static final Map<String, MediaType> EXTENSION_MEDIA_TYPES = Map.ofEntries(
        Map.entry(".jpg", MediaType.IMAGE_JPEG),
        Map.entry(".jpeg", MediaType.IMAGE_JPEG),
        Map.entry(".png", MediaType.IMAGE_PNG),
        Map.entry(".gif", MediaType.IMAGE_GIF),
        Map.entry(".webp", MediaType.parseMediaType("image/webp")),
        Map.entry(".bmp", MediaType.parseMediaType("image/bmp")),
        Map.entry(".tif", MediaType.parseMediaType("image/tiff")),
        Map.entry(".tiff", MediaType.parseMediaType("image/tiff")),
        Map.entry(".heic", MediaType.parseMediaType("image/heic")),
        Map.entry(".svg", MediaType.parseMediaType("image/svg+xml")),
        Map.entry(".avif", MediaType.parseMediaType("image/avif")),
        Map.entry(".jxl", MediaType.parseMediaType("image/jxl"))
    );

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
        MediaType mediaType = resolveMediaType(path);
        return ResponseEntity.ok()
            .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
            .contentType(mediaType)
            .body(body);
    }

    private static MediaType resolveMediaType(Path path) {
        try {
            String probe = Files.probeContentType(path);
            if (probe != null) {
                MediaType probed = MediaType.parseMediaType(probe);
                if (!MediaType.APPLICATION_OCTET_STREAM.includes(probed)) {
                    return probed;
                }
            }
        } catch (IOException | IllegalArgumentException ignored) {
            /* fall back to extension */
        }
        String filename = path.getFileName().toString();
        int dot = filename.lastIndexOf('.');
        if (dot >= 0 && dot < filename.length() - 1) {
            String ext = filename.substring(dot).toLowerCase(Locale.ROOT);
            MediaType byExt = EXTENSION_MEDIA_TYPES.get(ext);
            if (byExt != null) {
                return byExt;
            }
        }
        return MediaType.APPLICATION_OCTET_STREAM;
    }
}

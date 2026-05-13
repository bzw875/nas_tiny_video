package com.videomanager.gallery;

import com.videomanager.common.BadRequestException;
import com.videomanager.common.NotFoundException;
import com.videomanager.config.AppProperties;
import com.videomanager.gallery.dto.GalleryItemDto;
import com.videomanager.gallery.dto.QueryGalleryDto;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;
import org.springframework.stereotype.Service;

@Service
public class GalleryServiceImpl implements GalleryService {

    private static final Set<String> IMAGE_EXTENSIONS = Set.of(
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp",
        ".tif", ".tiff", ".heic", ".svg", ".avif", ".jxl"
    );

    private final AppProperties appProperties;

    public GalleryServiceImpl(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    @Override
    public Map<String, Object> list(QueryGalleryDto dto) {
        Path root = galleryRoot();

        List<GalleryItemDto> collected = new ArrayList<>();
        try (Stream<Path> stream = Files.list(root)) {
            stream.filter(Files::isRegularFile).forEach(p -> {
                if (!isAllowedImage(p)) {
                    return;
                }
                String filename = p.getFileName().toString();
                try {
                    long size = Files.size(p);
                    long mtime = Files.getLastModifiedTime(p).toMillis();
                    collected.add(new GalleryItemDto(filename, size, mtime));
                } catch (IOException ignored) {
                    /* skip unreadable */
                }
            });
        } catch (IOException ex) {
            throw new BadRequestException("Cannot read gallery directory: " + ex.getMessage());
        }

        String sortBy = normalizeSortBy(dto.sortBy());
        String sortOrder = normalizeSortOrder(dto.sortOrder(), sortBy);

        Comparator<GalleryItemDto> primary = switch (sortBy) {
            case "size" -> Comparator.comparingLong(GalleryItemDto::size);
            case "modifiedTime" -> Comparator.comparingLong(GalleryItemDto::modifiedTime);
            default -> Comparator.comparing(
                GalleryItemDto::filename,
                String.CASE_INSENSITIVE_ORDER
            );
        };
        if ("desc".equals(sortOrder)) {
            primary = primary.reversed();
        }
        Comparator<GalleryItemDto> full = primary.thenComparing(
            GalleryItemDto::filename,
            String.CASE_INSENSITIVE_ORDER
        );
        collected.sort(full);

        int skip = dto.skip() == null ? 0 : Math.max(dto.skip(), 0);
        int take = dto.take() == null ? 50 : Math.min(Math.max(dto.take(), 1), 200);
        long total = collected.size();
        int from = Math.min(skip, collected.size());
        int to = Math.min(from + take, collected.size());
        List<GalleryItemDto> page = collected.subList(from, to);

        Map<String, Object> result = new HashMap<>();
        result.put("items", page);
        result.put("total", total);
        result.put("skip", skip);
        result.put("take", take);
        return result;
    }

    @Override
    public Path resolveReadableFile(String filename) {
        if (filename == null || filename.isBlank()) {
            throw new BadRequestException("Missing filename");
        }
        Path namePath = Path.of(filename);
        if (namePath.getNameCount() != 1) {
            throw new BadRequestException("Invalid filename");
        }
        String simple = namePath.getFileName().toString();
        if (simple.isEmpty() || ".".equals(simple) || "..".equals(simple)) {
            throw new BadRequestException("Invalid filename");
        }

        Path root = galleryRoot();
        Path file = root.resolve(namePath).normalize();
        if (!file.startsWith(root)) {
            throw new BadRequestException("Invalid path");
        }
        if (!Files.isRegularFile(file) || !isAllowedImage(file)) {
            throw new NotFoundException("Image not found");
        }
        return file;
    }

    private Path galleryRoot() {
        String raw = appProperties.galleryDir();
        if (raw == null || raw.isBlank()) {
            throw new BadRequestException("Gallery directory is not configured (app.gallery-dir / GALLERY_DIR)");
        }
        Path root = Path.of(raw).toAbsolutePath().normalize();
        if (!Files.isDirectory(root)) {
            throw new BadRequestException("Gallery directory does not exist or is not a folder: " + root);
        }
        return root;
    }

    private static boolean isAllowedImage(Path path) {
        String name = path.getFileName().toString();
        int dot = name.lastIndexOf('.');
        if (dot < 0 || dot == name.length() - 1) {
            return false;
        }
        String ext = name.substring(dot).toLowerCase(Locale.ROOT);
        return IMAGE_EXTENSIONS.contains(ext);
    }

    private static String normalizeSortBy(String sortBy) {
        if (sortBy == null || sortBy.isBlank()) {
            return "modifiedTime";
        }
        return switch (sortBy.trim()) {
            case "size", "modifiedTime", "filename" -> sortBy.trim();
            case "name" -> "filename";
            default -> "modifiedTime";
        };
    }

    private static String normalizeSortOrder(String sortOrder, String sortBy) {
        if (sortOrder != null && !sortOrder.isBlank()) {
            String o = sortOrder.trim().toLowerCase(Locale.ROOT);
            if ("asc".equals(o) || "desc".equals(o)) {
                return o;
            }
        }
        return switch (sortBy) {
            case "filename" -> "asc";
            default -> "desc";
        };
    }
}

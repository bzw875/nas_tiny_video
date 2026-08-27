package com.videomanager.gallery;

import com.videomanager.gallery.dto.GalleryItemDto;
import com.videomanager.gallery.dto.QueryGalleryDto;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

public interface GalleryService {

    Map<String, Object> list(QueryGalleryDto dto);

    Path resolveReadableFile(String filename);
}

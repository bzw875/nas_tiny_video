package com.videomanager.videos;

import com.videomanager.videos.dto.QueryVideosDto;
import java.util.List;
import java.util.Map;

public interface VideosService {
    Map<String, Object> findAll(QueryVideosDto dto);
    Map<String, Object> findOne(int id);
    Map<String, Object> updateTags(int id, List<Integer> tagIds);
    Map<String, Object> getFolderListing(String parent);
}

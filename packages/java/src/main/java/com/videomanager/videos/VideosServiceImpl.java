package com.videomanager.videos;

import com.videomanager.videos.dto.QueryVideosDto;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class VideosServiceImpl implements VideosService {

    @Override
    public Map<String, Object> findAll(QueryVideosDto dto) {
        throw new UnsupportedOperationException("TODO: implement videos list query");
    }

    @Override
    public Map<String, Object> findOne(int id) {
        throw new UnsupportedOperationException("TODO: implement find video detail");
    }

    @Override
    public Map<String, Object> updateTags(int id, List<Integer> tagIds) {
        throw new UnsupportedOperationException("TODO: implement patch video tags");
    }

    @Override
    public Map<String, Object> getFolderListing(String parent) {
        throw new UnsupportedOperationException("TODO: implement folder listing");
    }
}

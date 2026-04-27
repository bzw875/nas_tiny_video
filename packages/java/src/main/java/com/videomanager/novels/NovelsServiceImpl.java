package com.videomanager.novels;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class NovelsServiceImpl implements NovelsService {

    @Override
    public Object getNovelsLimit(int page, int limit) {
        throw new UnsupportedOperationException("TODO: implement novels list");
    }

    @Override
    public Object getNovelByName(String name) {
        throw new UnsupportedOperationException("TODO: implement novel by name");
    }

    @Override
    public Object getNovelPage(int id, Integer page) {
        throw new UnsupportedOperationException("TODO: implement novel page slice");
    }

    @Override
    public Object updateStarRating(int id, Integer starRating) {
        throw new UnsupportedOperationException("TODO: implement update star rating");
    }

    @Override
    public Object doScanning() {
        throw new UnsupportedOperationException("TODO: implement novel scanning");
    }

    @Override
    public Map<String, Object> deleteNovel(int id) {
        throw new UnsupportedOperationException("TODO: implement delete novel");
    }
}

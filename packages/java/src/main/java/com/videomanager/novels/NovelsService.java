package com.videomanager.novels;

import java.util.Map;

public interface NovelsService {
    Object getNovelsLimit(int page, int limit);
    Object getNovelByName(String name);
    Object getNovelPage(int id, Integer page);
    Object updateStarRating(int id, Integer starRating);
    Object doScanning();
    Map<String, Object> deleteNovel(int id);
}

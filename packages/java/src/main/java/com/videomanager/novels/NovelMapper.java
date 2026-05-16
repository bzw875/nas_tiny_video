package com.videomanager.novels;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface NovelMapper {

    List<Map<String, Object>> selectNovelList(@Param("limit") int limit, @Param("offset") int offset);

    List<Map<String, Object>> selectNovelByName(@Param("name") String name);

    Map<String, Object> selectNovelMetaById(@Param("id") int id);

    String selectContentSlice(@Param("id") int id, @Param("start") int start, @Param("len") int len);

    int incrementReadCount(@Param("id") int id);

    Integer selectStarRatingById(@Param("id") int id);

    int updateStarRating(@Param("id") int id, @Param("starRating") int starRating);

    int countByName(@Param("name") String name);

    int insertNovel(
        @Param("name") String name,
        @Param("content") String content,
        @Param("author") String author,
        @Param("starRating") int starRating,
        @Param("wordCount") int wordCount,
        @Param("readCount") int readCount
    );

    int deleteById(@Param("id") int id);
}

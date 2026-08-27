package com.videomanager.videos;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface VideoMapper {

    List<Map<String, Object>> selectVideoPage(VideoPageQuery query);

    long countVideos(VideoPageQuery query);

    Map<String, Object> selectVideoById(@Param("id") int id);

    int deleteVideoTags(@Param("videoId") int videoId);

    int insertVideoTag(@Param("videoId") int videoId, @Param("tagId") int tagId);

    List<Map<String, Object>> selectTagsForVideoIds(@Param("ids") List<Integer> ids);

    List<Map<String, Object>> selectVideosForFolder(@Param("pathPrefix") String pathPrefix);

    List<Map<String, Object>> selectRootFolderSubfolders();

    List<Map<String, Object>> selectRootFolderFiles();
}

package com.videomanager.treehole;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface TreeholeMapper {

    List<Map<String, Object>> selectComments(
        @Param("schema") String schema,
        @Param("minVote") Integer minVote,
        @Param("maxVote") Integer maxVote,
        @Param("orderBy") String orderBy,
        @Param("limit") int limit,
        @Param("offset") long offset
    );

    long countComments(
        @Param("schema") String schema,
        @Param("minVote") Integer minVote,
        @Param("maxVote") Integer maxVote
    );

    List<Map<String, Object>> selectCommentsByAuthor(
        @Param("schema") String schema,
        @Param("author") String author,
        @Param("limit") int limit,
        @Param("offset") long offset
    );

    long countCommentsByAuthor(
        @Param("schema") String schema,
        @Param("author") String author
    );

    List<Map<String, Object>> searchComments(
        @Param("schema") String schema,
        @Param("keyword") String keyword,
        @Param("limit") int limit,
        @Param("offset") long offset
    );

    long countSearchComments(
        @Param("schema") String schema,
        @Param("keyword") String keyword
    );

    List<Map<String, Object>> selectAuthorStatistics(@Param("schema") String schema);

    List<Map<String, Object>> selectAishPosts(@Param("schema") String schema);
}

package com.videomanager.ebooks;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface EbookMapper {

    List<Map<String, Object>> selectPage(EbookPageQuery query);

    long countPage(EbookPageQuery query);

    Map<String, Object> selectById(@Param("id") int id);

    int insertEbook(
        @Param("title") String title,
        @Param("author") String author,
        @Param("filePath") String filePath,
        @Param("format") String format,
        @Param("sizeBytes") long sizeBytes
    );

    int updateEbook(
        @Param("id") int id,
        @Param("title") String title,
        @Param("author") String author,
        @Param("filePath") String filePath,
        @Param("format") String format,
        @Param("sizeBytes") long sizeBytes
    );

    int deleteById(@Param("id") int id);
}

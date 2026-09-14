package com.videomanager.ebooks;

import com.videomanager.ebooks.dto.CreateEbookDto;
import com.videomanager.ebooks.dto.QueryEbooksDto;
import com.videomanager.ebooks.dto.UpdateEbookDto;
import java.util.Map;

public interface EbooksService {
    Map<String, Object> findAll(QueryEbooksDto dto);

    Map<String, Object> findOne(int id);

    Map<String, Object> create(CreateEbookDto dto);

    Map<String, Object> update(int id, UpdateEbookDto dto);

    Map<String, Object> delete(int id);
}

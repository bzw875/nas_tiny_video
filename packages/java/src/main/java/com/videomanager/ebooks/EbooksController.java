package com.videomanager.ebooks;

import com.videomanager.ebooks.dto.CreateEbookDto;
import com.videomanager.ebooks.dto.QueryEbooksDto;
import com.videomanager.ebooks.dto.UpdateEbookDto;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class EbooksController {

    private final EbooksService ebooksService;

    public EbooksController(EbooksService ebooksService) {
        this.ebooksService = ebooksService;
    }

    @GetMapping("/ebooks")
    public Object list(@Valid QueryEbooksDto dto) {
        return ebooksService.findAll(dto);
    }

    @GetMapping("/ebooks/{id}")
    public Object one(@PathVariable int id) {
        return ebooksService.findOne(id);
    }

    @PostMapping("/ebooks")
    public Object create(@Valid @RequestBody CreateEbookDto body) {
        return ebooksService.create(body);
    }

    @PutMapping("/ebooks/{id}")
    public Object update(@PathVariable int id, @Valid @RequestBody UpdateEbookDto body) {
        return ebooksService.update(id, body);
    }

    @DeleteMapping("/ebooks/{id}")
    public Object delete(@PathVariable int id) {
        return ebooksService.delete(id);
    }
}

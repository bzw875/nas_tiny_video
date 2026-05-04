package com.videomanager.aish123;

import com.videomanager.aish123.dto.QueryAish123Dto;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class Aish123Controller {

    private final Aish123Service aish123Service;

    public Aish123Controller(Aish123Service aish123Service) {
        this.aish123Service = aish123Service;
    }

    @GetMapping("/aish123")
    public Object list(@Valid QueryAish123Dto dto) {
        return aish123Service.findAll(dto);
    }

    @GetMapping("/aish123/stats/by-type")
    public Object statsByType() {
        return aish123Service.countByTypeName();
    }

    @GetMapping("/aish123/{tid}")
    public Object one(@PathVariable int tid) {
        return aish123Service.findOne(tid);
    }
}

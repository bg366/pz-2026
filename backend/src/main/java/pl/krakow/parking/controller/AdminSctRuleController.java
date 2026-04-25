package pl.krakow.parking.controller;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.krakow.parking.dto.SctRuleResponse;
import pl.krakow.parking.dto.SctRuleUpsertRequest;
import pl.krakow.parking.service.SctRuleService;

@RestController
@RequestMapping("/api/admin/sct-rules")
public class AdminSctRuleController {

    private final SctRuleService sctRuleService;

    public AdminSctRuleController(SctRuleService sctRuleService) {
        this.sctRuleService = sctRuleService;
    }

    @GetMapping
    public List<SctRuleResponse> getAll() {
        return sctRuleService.findAll();
    }

    @PostMapping
    public SctRuleResponse create(@Valid @RequestBody SctRuleUpsertRequest request) {
        return sctRuleService.create(request);
    }

    @PutMapping("/{id}")
    public SctRuleResponse update(@PathVariable Long id, @Valid @RequestBody SctRuleUpsertRequest request) {
        return sctRuleService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        sctRuleService.delete(id);
    }
}

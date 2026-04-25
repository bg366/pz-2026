package pl.krakow.parking.service;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.krakow.parking.dto.SctRuleResponse;
import pl.krakow.parking.dto.SctRuleUpsertRequest;
import pl.krakow.parking.exception.ResourceNotFoundException;
import pl.krakow.parking.mapper.SctRuleMapper;
import pl.krakow.parking.model.SctRule;
import pl.krakow.parking.repository.SctRuleRepository;

@Service
public class SctRuleService {

    private final SctRuleRepository sctRuleRepository;
    private final SctRuleMapper sctRuleMapper;

    public SctRuleService(SctRuleRepository sctRuleRepository, SctRuleMapper sctRuleMapper) {
        this.sctRuleRepository = sctRuleRepository;
        this.sctRuleMapper = sctRuleMapper;
    }

    @Transactional(readOnly = true)
    public List<SctRuleResponse> findAll() {
        return sctRuleMapper.toResponses(sctRuleRepository.findAllByOrderByZoneAscFuelTypeAscValidFromDesc());
    }

    @Transactional
    public SctRuleResponse create(SctRuleUpsertRequest request) {
        SctRule rule = SctRule.builder()
            .zone(request.zone())
            .fuelType(request.fuelType())
            .minEmissionStandard(request.minEmissionStandard())
            .allowed(request.allowed())
            .validFrom(request.validFrom())
            .validTo(request.validTo())
            .description(request.description())
            .build();
        return sctRuleMapper.toResponse(sctRuleRepository.save(rule));
    }

    @Transactional
    public SctRuleResponse update(Long id, SctRuleUpsertRequest request) {
        SctRule rule = sctRuleRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("SCT rule with id %d was not found.".formatted(id)));

        rule.setZone(request.zone());
        rule.setFuelType(request.fuelType());
        rule.setMinEmissionStandard(request.minEmissionStandard());
        rule.setAllowed(request.allowed());
        rule.setValidFrom(request.validFrom());
        rule.setValidTo(request.validTo());
        rule.setDescription(request.description());

        return sctRuleMapper.toResponse(sctRuleRepository.save(rule));
    }

    @Transactional
    public void delete(Long id) {
        SctRule rule = sctRuleRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("SCT rule with id %d was not found.".formatted(id)));
        sctRuleRepository.delete(rule);
    }
}

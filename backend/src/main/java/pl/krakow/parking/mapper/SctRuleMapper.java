package pl.krakow.parking.mapper;

import java.util.List;
import org.mapstruct.Mapper;
import pl.krakow.parking.dto.SctRuleResponse;
import pl.krakow.parking.model.SctRule;

@Mapper(componentModel = "spring")
public interface SctRuleMapper {

    SctRuleResponse toResponse(SctRule rule);

    List<SctRuleResponse> toResponses(List<SctRule> rules);
}

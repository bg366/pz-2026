package pl.krakow.parking.mapper;

import java.util.List;
import org.mapstruct.Mapper;
import pl.krakow.parking.dto.TariffResponse;
import pl.krakow.parking.model.Tariff;

@Mapper(componentModel = "spring")
public interface TariffMapper {

    TariffResponse toResponse(Tariff tariff);

    List<TariffResponse> toResponses(List<Tariff> tariffs);
}

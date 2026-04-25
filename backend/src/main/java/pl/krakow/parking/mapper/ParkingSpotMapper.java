package pl.krakow.parking.mapper;

import java.util.List;
import org.mapstruct.Mapper;
import pl.krakow.parking.dto.ParkingSpotResponse;
import pl.krakow.parking.model.ParkingSpot;

@Mapper(componentModel = "spring")
public interface ParkingSpotMapper {

    ParkingSpotResponse toResponse(ParkingSpot spot);

    List<ParkingSpotResponse> toResponses(List<ParkingSpot> spots);
}

package pl.krakow.parking.dto;

import java.util.List;
import pl.krakow.parking.model.ParkingZone;

public record ParkingLotResponse(
    Long id,
    String name,
    String address,
    ParkingZone zone,
    Double latitude,
    Double longitude,
    Integer totalSpots,
    Integer occupiedSpots,
    String parkingType,
    List<TariffResponse> tariffs
) {
}

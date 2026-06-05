package pl.krakow.parking.dto;

import java.util.List;
import pl.krakow.parking.model.ParkingLotStatus;
import pl.krakow.parking.model.ParkingZone;

public record ParkingLotResponse(
    Long id,
    String name,
    String address,
    String description,
    ParkingLotStatus status,
    ParkingZone zone,
    Double latitude,
    Double longitude,
    Integer totalSpots,
    Integer occupiedSpots,
    Integer totalSctSpots,
    Integer occupiedSctSpots,
    String openingHours,
    String parkingType,
    List<ParkingSpotResponse> spots,
    PriceResponse price
) {
}

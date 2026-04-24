package pl.krakow.parking.dto;

import java.math.BigDecimal;
import pl.krakow.parking.model.ParkingZone;

public record ParkingSearchResponse(
    Long id,
    String name,
    String address,
    ParkingZone zone,
    Double latitude,
    Double longitude,
    Double distanceKm,
    Boolean sctAllowed,
    Integer availableSpots,
    BigDecimal pricePerHour,
    String currency,
    String parkingType
) {
}

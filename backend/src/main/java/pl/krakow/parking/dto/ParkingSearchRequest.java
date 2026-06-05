package pl.krakow.parking.dto;

import pl.krakow.parking.model.EmissionStandard;
import pl.krakow.parking.model.FuelType;
import java.math.BigDecimal;
import pl.krakow.parking.model.ParkingSearchSort;
import pl.krakow.parking.model.ParkingZone;

public record ParkingSearchRequest(
    double lat,
    double lng,
    double radiusKm,
    FuelType fuelType,
    EmissionStandard emissionStandard,
    BigDecimal maxPricePerHour,
    String name,
    ParkingZone zone,
    boolean onlyAvailable,
    boolean openNow,
    ParkingSearchSort sort,
    Integer durationMinutes
) {
}

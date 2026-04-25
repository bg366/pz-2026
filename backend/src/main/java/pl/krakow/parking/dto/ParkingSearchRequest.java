package pl.krakow.parking.dto;

import pl.krakow.parking.model.EmissionStandard;
import pl.krakow.parking.model.FuelType;
import java.math.BigDecimal;

public record ParkingSearchRequest(
    double lat,
    double lng,
    double radiusKm,
    FuelType fuelType,
    EmissionStandard emissionStandard,
    BigDecimal maxPricePerHour
) {
}

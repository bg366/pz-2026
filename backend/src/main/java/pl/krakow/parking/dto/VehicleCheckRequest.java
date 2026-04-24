package pl.krakow.parking.dto;

import jakarta.validation.constraints.NotNull;
import pl.krakow.parking.model.EmissionStandard;
import pl.krakow.parking.model.FuelType;
import pl.krakow.parking.model.ParkingZone;

public record VehicleCheckRequest(
    String registrationNumber,
    FuelType fuelType,
    EmissionStandard emissionStandard,
    @NotNull ParkingZone zone
) {
}

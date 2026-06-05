package pl.krakow.parking.dto;

import pl.krakow.parking.model.EmissionStandard;
import pl.krakow.parking.model.FuelType;

public record UserVehicleResponse(
    Long id,
    String brand,
    String model,
    String registrationNumber,
    FuelType fuelType,
    EmissionStandard emissionStandard,
    Integer productionYear,
    String vehicleType,
    Boolean sctCompliant,
    Boolean active
) {
}

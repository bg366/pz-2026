package pl.krakow.parking.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import pl.krakow.parking.model.EmissionStandard;
import pl.krakow.parking.model.FuelType;

public record UserVehicleRequest(
    @NotBlank @Size(max = 100) String brand,
    @NotBlank @Size(max = 100) String model,
    @NotBlank @Size(max = 20) String registrationNumber,
    @NotNull FuelType fuelType,
    @NotNull EmissionStandard emissionStandard,
    @NotNull @Min(1900) @Max(2100) Integer productionYear,
    @NotBlank @Size(max = 30) String vehicleType,
    Boolean active
) {
}

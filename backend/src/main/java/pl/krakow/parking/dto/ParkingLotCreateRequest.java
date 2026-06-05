package pl.krakow.parking.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import pl.krakow.parking.model.ParkingAccessType;
import pl.krakow.parking.model.ParkingLotStatus;
import pl.krakow.parking.model.ParkingZone;

public record ParkingLotCreateRequest(
    @NotBlank String name,
    @NotBlank String address,
    @Size(max = 1000) String description,
    @NotNull ParkingLotStatus status,
    @NotNull ParkingZone zone,
    @NotNull @DecimalMin("-90.0") @DecimalMax("90.0") Double latitude,
    @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double longitude,
    @NotNull @Min(0) Integer totalSpots,
    @NotNull @Min(0) Integer totalSctSpots,
    @NotBlank @Size(max = 255) String openingHours,
    @NotBlank String parkingType,
    ParkingAccessType accessType
) {
}

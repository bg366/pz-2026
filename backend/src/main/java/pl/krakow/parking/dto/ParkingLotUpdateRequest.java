package pl.krakow.parking.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import pl.krakow.parking.model.ParkingZone;

public record ParkingLotUpdateRequest(
    @NotBlank String name,
    @NotBlank String address,
    @NotNull ParkingZone zone,
    @NotNull @DecimalMin("-90.0") @DecimalMax("90.0") Double latitude,
    @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double longitude,
    @NotNull @Min(0) Integer totalSpots,
    @NotNull @Min(0) Integer occupiedSpots,
    @NotBlank String parkingType
) {
}

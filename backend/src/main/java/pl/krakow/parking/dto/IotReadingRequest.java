package pl.krakow.parking.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record IotReadingRequest(
    @NotBlank String deviceId,
    @NotNull @Min(0) Integer occupiedSpots
) {
}

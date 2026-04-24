package pl.krakow.parking.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ParkingFeeRequest(
    @NotNull Long parkingLotId,
    @NotNull @Min(1) Integer durationMinutes
) {
}

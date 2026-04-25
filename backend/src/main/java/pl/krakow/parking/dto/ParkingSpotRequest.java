package pl.krakow.parking.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import pl.krakow.parking.model.SpotCategory;

public record ParkingSpotRequest(
    @NotNull SpotCategory category,
    @NotNull @Min(0) Integer total,
    @NotNull @Min(0) Integer occupied
) {
}

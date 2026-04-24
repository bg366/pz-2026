package pl.krakow.parking.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record OccupancyUpdateRequest(@NotNull @Min(0) Integer occupiedSpots) {
}

package pl.krakow.parking.dto;

import pl.krakow.parking.model.SpotCategory;

public record ParkingSpotResponse(
    Long id,
    SpotCategory category,
    Integer total,
    Integer occupied
) {
}

package pl.krakow.parking.dto;

import java.time.LocalDateTime;

public record OccupancyReportResponse(
    Long parkingLotId,
    String parkingLotName,
    Integer occupiedSpots,
    Integer totalSpots,
    Integer availableSpots,
    Integer occupiedSctSpots,
    Integer totalSctSpots,
    Integer availableSctSpots,
    Double occupancyPercent,
    LocalDateTime recordedAt
) {
}

package pl.krakow.parking.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import pl.krakow.parking.model.ParkingSessionStatus;

public record ParkingSessionResponse(
    Long id,
    Long parkingLotId,
    String parkingLotName,
    String parkingLotAddress,
    String registrationNumber,
    LocalDateTime startedAt,
    LocalDateTime endedAt,
    ParkingSessionStatus status,
    BigDecimal amount,
    String currency,
    String paymentToken
) {
}

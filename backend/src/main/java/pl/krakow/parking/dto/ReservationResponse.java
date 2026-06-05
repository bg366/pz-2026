package pl.krakow.parking.dto;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import pl.krakow.parking.model.ReservationStatus;

public record ReservationResponse(
    Long id,
    Long parkingLotId,
    String parkingLotName,
    String parkingLotAddress,
    ReservationStatus status,
    LocalDateTime startsAt,
    LocalDateTime endsAt,
    LocalDateTime createdAt,
    BigDecimal estimatedAmount,
    String currency,
    String pricingMode,
    String paymentToken
) {
}

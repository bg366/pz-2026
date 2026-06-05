package pl.krakow.parking.dto;

import java.math.BigDecimal;
import pl.krakow.parking.model.PaymentStatus;

public record PaymentResponse(
    Long id,
    Long reservationId,
    BigDecimal amount,
    String currency,
    PaymentStatus status,
    String token
) {
}

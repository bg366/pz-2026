package pl.krakow.parking.dto;

import java.math.BigDecimal;

public record ExitPaymentResponse(
    boolean success,
    String message,
    String paymentToken,
    BigDecimal amount,
    String currency
) {
}

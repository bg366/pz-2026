package pl.krakow.parking.dto;

import java.math.BigDecimal;

public record ParkingFeeBreakdownItem(
    String label,
    Integer hours,
    BigDecimal unitPrice,
    BigDecimal amount
) {
}

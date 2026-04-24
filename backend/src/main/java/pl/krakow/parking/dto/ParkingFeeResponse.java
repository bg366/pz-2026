package pl.krakow.parking.dto;

import java.math.BigDecimal;

public record ParkingFeeResponse(
    Long parkingLotId,
    Integer durationMinutes,
    BigDecimal amount,
    String currency
) {
}

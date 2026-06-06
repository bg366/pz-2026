package pl.krakow.parking.dto;

import java.math.BigDecimal;
import java.util.List;

public record ParkingFeeResponse(
    Long parkingLotId,
    Integer durationMinutes,
    BigDecimal amount,
    String currency,
    BigDecimal hourlyAmount,
    BigDecimal dailyAmount,
    String selectedPricingMode,
    List<ParkingFeeBreakdownItem> breakdown
) {
}

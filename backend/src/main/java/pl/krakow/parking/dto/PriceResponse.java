package pl.krakow.parking.dto;

import java.math.BigDecimal;
import pl.krakow.parking.model.ParkingZone;

public record PriceResponse(
    Long id,
    ParkingZone zone,
    Long parkingLotId,
    BigDecimal firstHourPrice,
    BigDecimal secondHourPrice,
    BigDecimal thirdHourPrice,
    BigDecimal nextHourPrice,
    BigDecimal dailyPrice,
    String currency
) {
}

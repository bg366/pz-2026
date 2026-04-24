package pl.krakow.parking.dto;

import java.math.BigDecimal;
import java.time.LocalTime;
import pl.krakow.parking.model.ParkingZone;

public record TariffResponse(
    Long id,
    ParkingZone zone,
    String dayOfWeek,
    LocalTime hourFrom,
    LocalTime hourTo,
    BigDecimal pricePerHour,
    String currency
) {
}

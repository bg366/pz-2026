package pl.krakow.parking.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalTime;
import pl.krakow.parking.model.ParkingZone;

public record TariffUpsertRequest(
    @NotNull ParkingZone zone,
    String dayOfWeek,
    LocalTime hourFrom,
    LocalTime hourTo,
    @NotNull @DecimalMin("0.0") BigDecimal pricePerHour,
    @NotBlank String currency
) {
}

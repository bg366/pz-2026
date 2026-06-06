package pl.krakow.parking.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record PriceUpsertRequest(
    @NotNull @DecimalMin("0.0") BigDecimal firstHourPrice,
    @NotNull @DecimalMin("0.0") BigDecimal secondHourPrice,
    @NotNull @DecimalMin("0.0") BigDecimal thirdHourPrice,
    @NotNull @DecimalMin("0.0") BigDecimal nextHourPrice,
    @NotNull @DecimalMin("0.0") BigDecimal dailyPrice
) {
}

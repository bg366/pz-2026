package pl.krakow.parking.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import pl.krakow.parking.model.EmissionStandard;
import pl.krakow.parking.model.FuelType;
import pl.krakow.parking.model.ParkingZone;

public record SctRuleUpsertRequest(
    @NotNull ParkingZone zone,
    @NotNull FuelType fuelType,
    @NotNull EmissionStandard minEmissionStandard,
    @NotNull Boolean allowed,
    @NotNull LocalDate validFrom,
    LocalDate validTo,
    String description
) {
}

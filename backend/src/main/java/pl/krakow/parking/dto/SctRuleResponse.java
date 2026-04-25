package pl.krakow.parking.dto;

import java.time.LocalDate;
import pl.krakow.parking.model.EmissionStandard;
import pl.krakow.parking.model.FuelType;
import pl.krakow.parking.model.ParkingZone;

public record SctRuleResponse(
    Long id,
    ParkingZone zone,
    FuelType fuelType,
    EmissionStandard minEmissionStandard,
    Boolean allowed,
    LocalDate validFrom,
    LocalDate validTo,
    String description
) {
}

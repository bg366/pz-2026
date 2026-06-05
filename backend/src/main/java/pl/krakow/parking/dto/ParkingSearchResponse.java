package pl.krakow.parking.dto;

import java.math.BigDecimal;
import pl.krakow.parking.model.ParkingLotStatus;
import pl.krakow.parking.model.ParkingPermission;
import pl.krakow.parking.model.ParkingZone;

public record ParkingSearchResponse(
    Long id,
    String name,
    String address,
    String description,
    ParkingLotStatus status,
    ParkingZone zone,
    Double latitude,
    Double longitude,
    Double distanceKm,
    Boolean sctAllowed,
    Integer availableSpots,
    Integer availableRegularSpots,
    Integer availableSctSpots,
    ParkingPermission parkingPermission,
    String permissionReason,
    String openingHours,
    BigDecimal predictedAmount,
    String predictedPricingMode,
    BigDecimal pricePerHour,
    String currency,
    String parkingType
) {
}

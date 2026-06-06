package pl.krakow.parking.dto;

import java.time.LocalDateTime;
import pl.krakow.parking.model.IotDeviceStatus;

public record IotDeviceResponse(
    Long id,
    Long parkingLotId,
    String parkingLotName,
    String externalDeviceId,
    IotDeviceStatus status,
    LocalDateTime lastSeenAt,
    LocalDateTime createdAt
) {
}

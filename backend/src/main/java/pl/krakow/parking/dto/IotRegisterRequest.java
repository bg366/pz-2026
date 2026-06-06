package pl.krakow.parking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record IotRegisterRequest(
    @NotNull Long parkingLotId,
    @NotBlank String externalDeviceId
) {
}

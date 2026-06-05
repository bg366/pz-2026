package pl.krakow.parking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record StartSessionRequest(
    @NotNull Long parkingLotId,
    @NotBlank @Size(min = 3, max = 20) String registrationNumber
) {
}

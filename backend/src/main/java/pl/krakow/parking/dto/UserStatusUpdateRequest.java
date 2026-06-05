package pl.krakow.parking.dto;

import jakarta.validation.constraints.NotNull;
import pl.krakow.parking.model.UserStatus;

public record UserStatusUpdateRequest(
    @NotNull UserStatus status
) {
}

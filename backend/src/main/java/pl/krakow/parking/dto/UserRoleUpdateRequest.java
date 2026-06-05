package pl.krakow.parking.dto;

import jakarta.validation.constraints.NotNull;
import pl.krakow.parking.model.UserRole;

public record UserRoleUpdateRequest(
    @NotNull UserRole role
) {
}

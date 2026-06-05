package pl.krakow.parking.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.Set;
import pl.krakow.parking.model.UserRole;

public record UserRoleUpdateRequest(
    @NotNull @NotEmpty Set<UserRole> roles
) {
}

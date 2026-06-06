package pl.krakow.parking.dto;

import java.util.Set;
import pl.krakow.parking.model.UserRole;
import pl.krakow.parking.model.UserStatus;

public record AdminUserSummaryResponse(
    Long id,
    String firstName,
    String lastName,
    String email,
    Set<UserRole> roles,
    UserStatus status,
    int vehicleCount,
    String activeVehicleRegistration
) {
}

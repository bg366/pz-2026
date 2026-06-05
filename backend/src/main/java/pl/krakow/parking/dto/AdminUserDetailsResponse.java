package pl.krakow.parking.dto;

import java.util.List;
import java.util.Set;
import pl.krakow.parking.model.UserRole;
import pl.krakow.parking.model.UserStatus;

public record AdminUserDetailsResponse(
    Long id,
    String firstName,
    String lastName,
    String email,
    Set<UserRole> roles,
    UserStatus status,
    List<UserVehicleResponse> vehicles
) {
}

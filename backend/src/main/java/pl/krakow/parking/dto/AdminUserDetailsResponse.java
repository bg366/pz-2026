package pl.krakow.parking.dto;

import java.util.List;
import pl.krakow.parking.model.UserRole;
import pl.krakow.parking.model.UserStatus;

public record AdminUserDetailsResponse(
    Long id,
    String firstName,
    String lastName,
    String email,
    UserRole role,
    UserStatus status,
    List<UserVehicleResponse> vehicles
) {
}

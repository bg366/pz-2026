package pl.krakow.parking.dto;

import pl.krakow.parking.model.UserRole;
import pl.krakow.parking.model.UserStatus;

public record UserProfileResponse(
    Long id,
    String firstName,
    String lastName,
    String email,
    UserRole role,
    UserStatus status
) {
}

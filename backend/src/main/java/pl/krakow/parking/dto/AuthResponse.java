package pl.krakow.parking.dto;

import pl.krakow.parking.model.UserRole;

public record AuthResponse(
    Long id,
    String firstName,
    String lastName,
    String email,
    UserRole role,
    String token
) {
}

package pl.krakow.parking.dto;

import java.util.Set;
import pl.krakow.parking.model.UserRole;

public record AuthResponse(
    Long id,
    String firstName,
    String lastName,
    String email,
    Set<UserRole> roles,
    String token
) {
}

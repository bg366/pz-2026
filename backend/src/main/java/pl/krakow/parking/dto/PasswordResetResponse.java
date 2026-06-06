package pl.krakow.parking.dto;

public record PasswordResetResponse(
    Long userId,
    String temporaryPassword
) {
}

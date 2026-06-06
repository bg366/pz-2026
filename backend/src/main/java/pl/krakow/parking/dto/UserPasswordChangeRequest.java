package pl.krakow.parking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UserPasswordChangeRequest(
    @NotBlank String currentPassword,
    @NotBlank @Size(min = 8, max = 100) String newPassword,
    @NotBlank @Size(min = 8, max = 100) String confirmPassword
) {
}

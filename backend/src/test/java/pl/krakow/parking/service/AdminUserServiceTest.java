package pl.krakow.parking.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import pl.krakow.parking.dto.PasswordResetResponse;
import pl.krakow.parking.dto.UserStatusUpdateRequest;
import pl.krakow.parking.model.User;
import pl.krakow.parking.model.UserRole;
import pl.krakow.parking.model.UserStatus;
import pl.krakow.parking.repository.UserRepository;
import pl.krakow.parking.repository.VehicleRepository;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private VehicleRepository vehicleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Test
    void shouldRejectBlockingCurrentAdminAccount() {
        User admin = user(1L, "admin@krakow-parking.local", UserRole.ADMIN, UserStatus.ACTIVE);
        given(userRepository.findById(1L)).willReturn(Optional.of(admin));

        AdminUserService service = new AdminUserService(userRepository, vehicleRepository, passwordEncoder);

        assertThatThrownBy(() -> service.updateStatus(
            1L,
            new UserStatusUpdateRequest(UserStatus.BLOCKED),
            "admin@krakow-parking.local"
        ))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Administrator cannot block own account.");
    }

    @Test
    void shouldResetPasswordWithEncodedTemporaryPassword() {
        User user = user(2L, "user@krakow-parking.local", UserRole.USER, UserStatus.ACTIVE);
        given(userRepository.findById(2L)).willReturn(Optional.of(user));
        given(passwordEncoder.encode(anyString())).willReturn("encoded-temporary-password");
        given(userRepository.save(user)).willReturn(user);

        AdminUserService service = new AdminUserService(userRepository, vehicleRepository, passwordEncoder);

        PasswordResetResponse response = service.resetPassword(2L);

        assertThat(response.userId()).isEqualTo(2L);
        assertThat(response.temporaryPassword()).hasSize(14);
        assertThat(user.getPasswordHash()).isEqualTo("encoded-temporary-password");
        verify(passwordEncoder).encode(response.temporaryPassword());
    }

    private User user(Long id, String email, UserRole role, UserStatus status) {
        return User.builder()
            .id(id)
            .firstName("Test")
            .lastName("User")
            .email(email)
            .passwordHash("old-hash")
            .roles(new HashSet<>(Set.of(role)))
            .status(status)
            .build();
    }
}

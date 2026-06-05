package pl.krakow.parking.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pl.krakow.parking.dto.AuthResponse;
import pl.krakow.parking.dto.UserPasswordChangeRequest;
import pl.krakow.parking.dto.UserVehicleRequest;
import pl.krakow.parking.dto.UserVehicleResponse;
import pl.krakow.parking.model.EmissionStandard;
import pl.krakow.parking.model.FuelType;
import pl.krakow.parking.model.ParkingZone;
import pl.krakow.parking.model.User;
import pl.krakow.parking.model.UserRole;
import pl.krakow.parking.model.UserStatus;
import pl.krakow.parking.model.Vehicle;
import pl.krakow.parking.repository.UserRepository;
import pl.krakow.parking.repository.VehicleRepository;
import pl.krakow.parking.security.JwtService;

@ExtendWith(MockitoExtension.class)
class UserProfileServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private VehicleRepository vehicleRepository;

    @Mock
    private SctVerificationService sctVerificationService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Test
    void shouldCreateActiveVehicleAndDeactivateExistingVehicles() {
        String email = "user@krakow-parking.local";
        User user = user();
        Vehicle previousVehicle = vehicle(10L, "KRA1111", true);
        UserVehicleRequest request = request("KRA2222", true);

        given(vehicleRepository.existsByUserEmailIgnoreCaseAndRegistrationNumberIgnoreCase(email, "KRA2222"))
            .willReturn(false);
        given(userRepository.findByEmailIgnoreCase(email)).willReturn(Optional.of(user));
        given(sctVerificationService.canEnter(FuelType.PETROL, EmissionStandard.EURO_6, ParkingZone.ZONE_A))
            .willReturn(true);
        given(vehicleRepository.findByUserEmailIgnoreCaseOrderByActiveDescIdAsc(email))
            .willReturn(List.of(previousVehicle));
        given(vehicleRepository.save(any(Vehicle.class))).willAnswer(invocation -> {
            Vehicle savedVehicle = invocation.getArgument(0);
            savedVehicle.setId(11L);
            return savedVehicle;
        });

        UserProfileService service = new UserProfileService(
            userRepository,
            vehicleRepository,
            sctVerificationService,
            passwordEncoder,
            jwtService
        );

        UserVehicleResponse response = service.createVehicle(email, request);

        assertThat(previousVehicle.getActive()).isFalse();
        assertThat(response.registrationNumber()).isEqualTo("KRA2222");
        assertThat(response.active()).isTrue();
        assertThat(response.sctCompliant()).isTrue();
    }

    @Test
    void shouldRejectVehicleUpdateWhenRegistrationBelongsToAnotherUserVehicle() {
        String email = "user@krakow-parking.local";
        Vehicle vehicle = vehicle(10L, "KRA1111", true);
        UserVehicleRequest request = request("KRA2222", false);

        given(vehicleRepository.findByIdAndUserEmailIgnoreCase(10L, email)).willReturn(Optional.of(vehicle));
        given(vehicleRepository.existsByUserEmailIgnoreCaseAndRegistrationNumberIgnoreCaseAndIdNot(
            email,
            "KRA2222",
            10L
        )).willReturn(true);

        UserProfileService service = new UserProfileService(
            userRepository,
            vehicleRepository,
            sctVerificationService,
            passwordEncoder,
            jwtService
        );

        assertThatThrownBy(() -> service.updateVehicle(email, 10L, request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Vehicle with this registration number already exists.");

        verify(vehicleRepository).findByIdAndUserEmailIgnoreCase(10L, email);
    }

    @Test
    void shouldChangePasswordAndReturnUpdatedAuthToken() {
        String email = "user@krakow-parking.local";
        User user = user();
        UserPasswordChangeRequest request = new UserPasswordChangeRequest("Old12345!", "New12345!", "New12345!");

        given(userRepository.findByEmailIgnoreCase(email)).willReturn(Optional.of(user));
        given(passwordEncoder.matches("Old12345!", user.getPasswordHash())).willReturn(true);
        given(passwordEncoder.matches("New12345!", user.getPasswordHash())).willReturn(false);
        given(passwordEncoder.encode("New12345!")).willReturn("new-hash");
        given(userRepository.save(user)).willReturn(user);
        given(jwtService.generateToken(user)).willReturn("jwt-token");

        UserProfileService service = new UserProfileService(
            userRepository,
            vehicleRepository,
            sctVerificationService,
            passwordEncoder,
            jwtService
        );

        AuthResponse response = service.changePassword(email, request);

        assertThat(user.getPasswordHash()).isEqualTo("new-hash");
        assertThat(response.token()).isEqualTo("jwt-token");
    }

    @Test
    void shouldRejectPasswordChangeWhenCurrentPasswordIsInvalid() {
        String email = "user@krakow-parking.local";
        User user = user();
        UserPasswordChangeRequest request = new UserPasswordChangeRequest("Bad12345!", "New12345!", "New12345!");

        given(userRepository.findByEmailIgnoreCase(email)).willReturn(Optional.of(user));
        given(passwordEncoder.matches("Bad12345!", user.getPasswordHash())).willReturn(false);

        UserProfileService service = new UserProfileService(
            userRepository,
            vehicleRepository,
            sctVerificationService,
            passwordEncoder,
            jwtService
        );

        assertThatThrownBy(() -> service.changePassword(email, request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Aktualne hasło jest nieprawidłowe.");
    }

    private UserVehicleRequest request(String registrationNumber, boolean active) {
        return new UserVehicleRequest(
            "Skoda",
            "Octavia",
            registrationNumber,
            FuelType.PETROL,
            EmissionStandard.EURO_6,
            2020,
            "CAR",
            active
        );
    }

    private User user() {
        return User.builder()
            .id(1L)
            .email("user@krakow-parking.local")
            .firstName("Jan")
            .lastName("Kierowca")
            .passwordHash("hash")
            .roles(new HashSet<>(Set.of(UserRole.USER)))
            .status(UserStatus.ACTIVE)
            .build();
    }

    private Vehicle vehicle(Long id, String registrationNumber, boolean active) {
        return Vehicle.builder()
            .id(id)
            .user(user())
            .brand("Skoda")
            .model("Octavia")
            .registrationNumber(registrationNumber)
            .fuelType(FuelType.PETROL)
            .emissionStandard(EmissionStandard.EURO_6)
            .productionYear(2020)
            .vehicleType("CAR")
            .sctCompliant(true)
            .active(active)
            .build();
    }
}

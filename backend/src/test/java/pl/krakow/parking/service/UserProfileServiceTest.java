package pl.krakow.parking.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
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

@ExtendWith(MockitoExtension.class)
class UserProfileServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private VehicleRepository vehicleRepository;

    @Mock
    private SctVerificationService sctVerificationService;

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
            sctVerificationService
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
            sctVerificationService
        );

        assertThatThrownBy(() -> service.updateVehicle(email, 10L, request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Vehicle with this registration number already exists.");

        verify(vehicleRepository).findByIdAndUserEmailIgnoreCase(10L, email);
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
            .role(UserRole.USER)
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

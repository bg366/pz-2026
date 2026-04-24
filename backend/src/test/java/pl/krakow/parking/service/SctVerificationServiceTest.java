package pl.krakow.parking.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pl.krakow.parking.dto.VehicleCheckRequest;
import pl.krakow.parking.dto.VehicleCheckResponse;
import pl.krakow.parking.model.EmissionStandard;
import pl.krakow.parking.model.FuelType;
import pl.krakow.parking.model.ParkingZone;
import pl.krakow.parking.model.SctRule;
import pl.krakow.parking.repository.SctRuleRepository;
import pl.krakow.parking.repository.VehicleRepository;

@ExtendWith(MockitoExtension.class)
class SctVerificationServiceTest {

    @Mock
    private SctRuleRepository sctRuleRepository;

    @Mock
    private VehicleRepository vehicleRepository;

    @Test
    void shouldRejectDieselVehicleBelowRequiredEmissionStandard() {
        given(sctRuleRepository.findActiveRules(ParkingZone.ZONE_A, FuelType.DIESEL, LocalDate.now()))
            .willReturn(List.of(
                SctRule.builder()
                    .zone(ParkingZone.ZONE_A)
                    .fuelType(FuelType.DIESEL)
                    .minEmissionStandard(EmissionStandard.EURO_5)
                    .allowed(true)
                    .validFrom(LocalDate.of(2024, 7, 1))
                    .build()
            ));

        SctVerificationService service = new SctVerificationService(sctRuleRepository, vehicleRepository);

        VehicleCheckResponse response = service.checkVehicle(
            new VehicleCheckRequest(null, FuelType.DIESEL, EmissionStandard.EURO_3, ParkingZone.ZONE_A)
        );

        assertThat(response.canEnter()).isFalse();
        assertThat(response.reason()).contains("Wymagane minimum: EURO 5");
    }
}

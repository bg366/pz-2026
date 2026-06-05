package pl.krakow.parking.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import pl.krakow.parking.config.SecurityConfig;
import pl.krakow.parking.dto.ParkingSearchResponse;
import pl.krakow.parking.exception.GlobalExceptionHandler;
import pl.krakow.parking.model.ParkingLotStatus;
import pl.krakow.parking.model.ParkingPermission;
import pl.krakow.parking.model.ParkingZone;
import pl.krakow.parking.service.ParkingLotService;

@WebMvcTest(PublicParkingController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class PublicParkingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ParkingLotService parkingLotService;

    @Test
    void shouldReturnParkingSearchResults() throws Exception {
        given(parkingLotService.searchNearby(any()))
            .willReturn(List.of(
                new ParkingSearchResponse(
                    1L,
                    "Parking Rynek Glowny",
                    "Rynek Glowny, Krakow",
                    "Parking testowy",
                    ParkingLotStatus.ACTIVE,
                    ParkingZone.ZONE_A,
                    50.0615,
                    19.9370,
                    0.35,
                    true,
                    30,
                    25,
                    5,
                    ParkingPermission.ALL_SPOTS,
                    "Vehicle meets SCT requirements.",
                    "24/7",
                    BigDecimal.valueOf(6),
                    "PLN",
                    "UNDERGROUND"
                )
            ));

        mockMvc.perform(get("/api/parking-lots/search")
                .param("lat", "50.0615")
                .param("lng", "19.9370")
                .param("radiusKm", "3")
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].name").value("Parking Rynek Glowny"))
            .andExpect(jsonPath("$[0].sctAllowed").value(true))
            .andExpect(jsonPath("$[0].distanceKm").value(0.35));
    }
}

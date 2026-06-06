package pl.krakow.parking.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import pl.krakow.parking.config.SecurityConfig;
import pl.krakow.parking.service.ParkingLotService;
import pl.krakow.parking.service.PriceService;

@WebMvcTest(OwnerParkingController.class)
@Import(SecurityConfig.class)
class OwnerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ParkingLotService parkingLotService;

    @MockBean
    private PriceService priceService;

    @Test
    void shouldRejectAnonymousAccessToOwnerEndpoints() throws Exception {
        mockMvc.perform(get("/api/owner/parking-lots"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldRejectRegularUserFromOwnerEndpoints() throws Exception {
        mockMvc.perform(get("/api/owner/parking-lots")
                .with(user("user@example.com").roles("USER")))
            .andExpect(status().isForbidden());
    }

    @Test
    void shouldAllowParkingOwnerOnOwnerEndpoints() throws Exception {
        given(parkingLotService.findAllByOwner(anyString())).willReturn(List.of());

        mockMvc.perform(get("/api/owner/parking-lots")
                .with(user("owner@example.com").roles("PARKING_OWNER")))
            .andExpect(status().isOk());
    }

    @Test
    void shouldAllowAdminOnOwnerEndpoints() throws Exception {
        given(parkingLotService.findAllByOwner(anyString())).willReturn(List.of());

        mockMvc.perform(get("/api/owner/parking-lots")
                .with(user("admin@example.com").roles("ADMIN")))
            .andExpect(status().isOk());
    }
}

package pl.krakow.parking.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.test.web.servlet.MockMvc;
import pl.krakow.parking.config.SecurityConfig;
import pl.krakow.parking.service.ParkingLotService;

@WebMvcTest(AdminParkingController.class)
@Import(SecurityConfig.class)
class AdminSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ParkingLotService parkingLotService;

    @Test
    void shouldRejectAnonymousUserFromAdminEndpoints() throws Exception {
        mockMvc.perform(get("/api/admin/parking-lots"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldRejectNonAdminUserFromAdminEndpoints() throws Exception {
        mockMvc.perform(get("/api/admin/parking-lots").with(user("user@example.com").roles("USER")))
            .andExpect(status().isForbidden());
    }

    @Test
    void shouldAllowAdminUserOnAdminEndpoints() throws Exception {
        given(parkingLotService.findAll(any(Pageable.class))).willReturn(Page.empty());

        mockMvc.perform(get("/api/admin/parking-lots").with(user("admin@example.com").roles("ADMIN")))
            .andExpect(status().isOk());
    }
}

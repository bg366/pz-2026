package pl.krakow.parking.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import pl.krakow.parking.config.SecurityConfig;
import pl.krakow.parking.dto.UserVehicleResponse;
import pl.krakow.parking.exception.GlobalExceptionHandler;
import pl.krakow.parking.model.EmissionStandard;
import pl.krakow.parking.model.FuelType;
import pl.krakow.parking.service.UserProfileService;

@WebMvcTest(UserProfileController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class UserProfileControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserProfileService userProfileService;

    @Test
    void shouldReturn401ForVehiclesEndpointWithoutAuth() throws Exception {
        mockMvc.perform(get("/api/me/vehicles"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldReturnVehiclesForAuthenticatedUser() throws Exception {
        given(userProfileService.getVehicles("jan@example.com")).willReturn(List.of(
            new UserVehicleResponse(
                1L, "Toyota", "Corolla", "KR12345",
                FuelType.PETROL, EmissionStandard.EURO_6,
                2020, "PASSENGER", true, true
            )
        ));

        mockMvc.perform(get("/api/me/vehicles")
                .with(user("jan@example.com").roles("USER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].brand").value("Toyota"))
            .andExpect(jsonPath("$[0].registrationNumber").value("KR12345"));
    }

    @Test
    void shouldAddVehicleWithValidData() throws Exception {
        given(userProfileService.createVehicle(eq("jan@example.com"), any())).willReturn(
            new UserVehicleResponse(
                2L, "Honda", "Civic", "KR99999",
                FuelType.HYBRID, EmissionStandard.EURO_6,
                2022, "PASSENGER", true, false
            )
        );

        mockMvc.perform(post("/api/me/vehicles")
                .with(user("jan@example.com").roles("USER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "brand": "Honda",
                      "model": "Civic",
                      "registrationNumber": "KR99999",
                      "fuelType": "HYBRID",
                      "emissionStandard": "EURO_6",
                      "productionYear": 2022,
                      "vehicleType": "PASSENGER",
                      "active": false
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.brand").value("Honda"));
    }

    @Test
    void shouldRejectVehicleWithInvalidProductionYear() throws Exception {
        mockMvc.perform(post("/api/me/vehicles")
                .with(user("jan@example.com").roles("USER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "brand": "Honda",
                      "model": "Civic",
                      "registrationNumber": "KR99999",
                      "fuelType": "HYBRID",
                      "emissionStandard": "EURO_6",
                      "productionYear": 1850,
                      "vehicleType": "PASSENGER",
                      "active": false
                    }
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void shouldRejectVehicleWithMissingBrand() throws Exception {
        mockMvc.perform(post("/api/me/vehicles")
                .with(user("jan@example.com").roles("USER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "model": "Civic",
                      "registrationNumber": "KR99999",
                      "fuelType": "HYBRID",
                      "emissionStandard": "EURO_6",
                      "productionYear": 2022,
                      "vehicleType": "PASSENGER"
                    }
                    """))
            .andExpect(status().isBadRequest());
    }

    @Test
    void shouldRejectVehicleWithBlankRegistrationNumber() throws Exception {
        mockMvc.perform(post("/api/me/vehicles")
                .with(user("jan@example.com").roles("USER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "brand": "Honda",
                      "model": "Civic",
                      "registrationNumber": "",
                      "fuelType": "HYBRID",
                      "emissionStandard": "EURO_6",
                      "productionYear": 2022,
                      "vehicleType": "PASSENGER"
                    }
                    """))
            .andExpect(status().isBadRequest());
    }
}

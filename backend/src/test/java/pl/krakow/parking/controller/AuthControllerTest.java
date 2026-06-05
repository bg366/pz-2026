package pl.krakow.parking.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;
import java.util.Set;
import pl.krakow.parking.config.SecurityConfig;
import pl.krakow.parking.dto.AuthResponse;
import pl.krakow.parking.dto.UserProfileResponse;
import pl.krakow.parking.exception.GlobalExceptionHandler;
import pl.krakow.parking.model.UserRole;
import pl.krakow.parking.model.UserStatus;
import pl.krakow.parking.service.AuthService;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthService authService;

    @Test
    void shouldRegisterUserWithValidData() throws Exception {
        given(authService.register(any())).willReturn(new AuthResponse(
            1L, "Jan", "Kowalski", "jan@example.com", Set.of(UserRole.USER), "dGVzdA=="
        ));

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "firstName": "Jan",
                      "lastName": "Kowalski",
                      "email": "jan@example.com",
                      "password": "SecurePass1!"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("jan@example.com"))
            .andExpect(jsonPath("$.roles[0]").value("USER"));
    }

    @Test
    void shouldRejectRegistrationWithInvalidEmail() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "firstName": "Jan",
                      "lastName": "Kowalski",
                      "email": "not-an-email",
                      "password": "SecurePass1!"
                    }
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void shouldRejectRegistrationWithShortPassword() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "firstName": "Jan",
                      "lastName": "Kowalski",
                      "email": "jan@example.com",
                      "password": "short"
                    }
                    """))
            .andExpect(status().isBadRequest());
    }

    @Test
    void shouldRejectRegistrationWithBlankFirstName() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "firstName": "",
                      "lastName": "Kowalski",
                      "email": "jan@example.com",
                      "password": "SecurePass1!"
                    }
                    """))
            .andExpect(status().isBadRequest());
    }

    @Test
    void shouldLoginWithValidCredentials() throws Exception {
        given(authService.login(any())).willReturn(new AuthResponse(
            1L, "Jan", "Kowalski", "jan@example.com", Set.of(UserRole.USER), "dGVzdA=="
        ));

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "jan@example.com",
                      "password": "SecurePass1!"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").exists());
    }

    @Test
    void shouldRejectLoginWithInvalidEmailFormat() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "not-valid",
                      "password": "pass"
                    }
                    """))
            .andExpect(status().isBadRequest());
    }

    @Test
    void shouldReturn401ForMeEndpointWithoutAuth() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldReturnProfileForAuthenticatedUser() throws Exception {
        given(authService.getProfile("jan@example.com")).willReturn(new UserProfileResponse(
            1L, "Jan", "Kowalski", "jan@example.com", Set.of(UserRole.USER), UserStatus.ACTIVE
        ));

        mockMvc.perform(get("/api/auth/me")
                .with(SecurityMockMvcRequestPostProcessors.user("jan@example.com").roles("USER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("jan@example.com"));
    }
}

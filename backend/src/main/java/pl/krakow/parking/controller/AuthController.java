package pl.krakow.parking.controller;

import jakarta.validation.Valid;
import java.security.Principal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.krakow.parking.dto.AuthResponse;
import pl.krakow.parking.dto.LoginRequest;
import pl.krakow.parking.dto.RegisterRequest;
import pl.krakow.parking.dto.UserProfileResponse;
import pl.krakow.parking.service.AuthService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/logout")
    public void logout() {
        // Stateless HTTP Basic logout is handled client-side by removing stored credentials.
    }

    @GetMapping("/me")
    public UserProfileResponse me(Principal principal) {
        return authService.getProfile(principal.getName());
    }
}

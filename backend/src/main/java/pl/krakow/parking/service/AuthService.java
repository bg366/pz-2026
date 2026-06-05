package pl.krakow.parking.service;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.krakow.parking.dto.AuthResponse;
import pl.krakow.parking.dto.LoginRequest;
import pl.krakow.parking.dto.RegisterRequest;
import pl.krakow.parking.dto.UserProfileResponse;
import pl.krakow.parking.exception.ResourceNotFoundException;
import pl.krakow.parking.model.User;
import pl.krakow.parking.model.UserRole;
import pl.krakow.parking.model.UserStatus;
import pl.krakow.parking.repository.UserRepository;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;

    public AuthService(
        UserRepository userRepository,
        PasswordEncoder passwordEncoder,
        AuthenticationManager authenticationManager
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new IllegalArgumentException("User with email %s already exists.".formatted(request.email()));
        }

        User user = User.builder()
            .firstName(request.firstName())
            .lastName(request.lastName())
            .email(request.email().toLowerCase())
            .passwordHash(passwordEncoder.encode(request.password()))
            .role(UserRole.USER)
            .status(UserStatus.ACTIVE)
            .build();

        User savedUser = userRepository.save(user);
        return toAuthResponse(savedUser, request.password());
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );
        User user = getActiveUser(authentication.getName());
        return toAuthResponse(user, request.password());
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(String email) {
        return toProfileResponse(getActiveUser(email));
    }

    private User getActiveUser(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new ResourceNotFoundException("User %s was not found.".formatted(email)));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new IllegalArgumentException("User account is not active.");
        }
        return user;
    }

    private AuthResponse toAuthResponse(User user, String rawPassword) {
        return new AuthResponse(
            user.getId(),
            user.getFirstName(),
            user.getLastName(),
            user.getEmail(),
            user.getRole(),
            Base64.getEncoder().encodeToString((user.getEmail() + ":" + rawPassword).getBytes(StandardCharsets.UTF_8))
        );
    }

    private UserProfileResponse toProfileResponse(User user) {
        return new UserProfileResponse(
            user.getId(),
            user.getFirstName(),
            user.getLastName(),
            user.getEmail(),
            user.getRole(),
            user.getStatus()
        );
    }
}

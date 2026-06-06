package pl.krakow.parking.controller;

import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.krakow.parking.dto.UserProfileResponse;
import pl.krakow.parking.dto.UserProfileUpdateRequest;
import pl.krakow.parking.dto.AuthResponse;
import pl.krakow.parking.dto.UserPasswordChangeRequest;
import pl.krakow.parking.dto.UserVehicleRequest;
import pl.krakow.parking.dto.UserVehicleResponse;
import pl.krakow.parking.service.UserProfileService;

@RestController
@RequestMapping("/api/me")
public class UserProfileController {

    private final UserProfileService userProfileService;

    public UserProfileController(UserProfileService userProfileService) {
        this.userProfileService = userProfileService;
    }

    @GetMapping
    public UserProfileResponse getProfile(Principal principal) {
        return userProfileService.getProfile(principal.getName());
    }

    @PutMapping
    public UserProfileResponse updateProfile(
        Principal principal,
        @Valid @RequestBody UserProfileUpdateRequest request
    ) {
        return userProfileService.updateProfile(principal.getName(), request);
    }

    @PutMapping("/password")
    public AuthResponse changePassword(
        Principal principal,
        @Valid @RequestBody UserPasswordChangeRequest request
    ) {
        return userProfileService.changePassword(principal.getName(), request);
    }

    @GetMapping("/vehicles")
    public List<UserVehicleResponse> getVehicles(Principal principal) {
        return userProfileService.getVehicles(principal.getName());
    }

    @PostMapping("/vehicles")
    public UserVehicleResponse createVehicle(
        Principal principal,
        @Valid @RequestBody UserVehicleRequest request
    ) {
        return userProfileService.createVehicle(principal.getName(), request);
    }

    @PutMapping("/vehicles/{id}")
    public UserVehicleResponse updateVehicle(
        Principal principal,
        @PathVariable Long id,
        @Valid @RequestBody UserVehicleRequest request
    ) {
        return userProfileService.updateVehicle(principal.getName(), id, request);
    }

    @DeleteMapping("/vehicles/{id}")
    public void deleteVehicle(Principal principal, @PathVariable Long id) {
        userProfileService.deleteVehicle(principal.getName(), id);
    }

    @PatchMapping("/vehicles/{id}/active")
    public UserVehicleResponse setActiveVehicle(Principal principal, @PathVariable Long id) {
        return userProfileService.setActiveVehicle(principal.getName(), id);
    }
}

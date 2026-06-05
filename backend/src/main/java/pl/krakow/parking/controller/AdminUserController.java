package pl.krakow.parking.controller;

import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.krakow.parking.dto.AdminUserDetailsResponse;
import pl.krakow.parking.dto.AdminUserSummaryResponse;
import pl.krakow.parking.dto.PasswordResetResponse;
import pl.krakow.parking.dto.UserRoleUpdateRequest;
import pl.krakow.parking.dto.UserStatusUpdateRequest;
import pl.krakow.parking.service.AdminUserService;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final AdminUserService adminUserService;

    public AdminUserController(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    @GetMapping
    public List<AdminUserSummaryResponse> getUsers() {
        return adminUserService.getUsers();
    }

    @GetMapping("/{id}")
    public AdminUserDetailsResponse getUser(@PathVariable Long id) {
        return adminUserService.getUser(id);
    }

    @PatchMapping("/{id}/role")
    public AdminUserDetailsResponse updateRole(
        @PathVariable Long id,
        @Valid @RequestBody UserRoleUpdateRequest request,
        Principal principal
    ) {
        return adminUserService.updateRole(id, request, principal.getName());
    }

    @PatchMapping("/{id}/status")
    public AdminUserDetailsResponse updateStatus(
        @PathVariable Long id,
        @Valid @RequestBody UserStatusUpdateRequest request,
        Principal principal
    ) {
        return adminUserService.updateStatus(id, request, principal.getName());
    }

    @PostMapping("/{id}/password-reset")
    public PasswordResetResponse resetPassword(@PathVariable Long id) {
        return adminUserService.resetPassword(id);
    }
}

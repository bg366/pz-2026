package pl.krakow.parking.service;

import java.security.SecureRandom;
import java.util.List;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.krakow.parking.dto.AdminUserDetailsResponse;
import pl.krakow.parking.dto.AdminUserSummaryResponse;
import pl.krakow.parking.dto.PasswordResetResponse;
import pl.krakow.parking.dto.UserRoleUpdateRequest;
import pl.krakow.parking.dto.UserStatusUpdateRequest;
import pl.krakow.parking.dto.UserVehicleResponse;
import pl.krakow.parking.exception.ResourceNotFoundException;
import pl.krakow.parking.model.User;
import pl.krakow.parking.model.UserRole;
import pl.krakow.parking.model.UserStatus;
import pl.krakow.parking.model.Vehicle;
import pl.krakow.parking.repository.UserRepository;
import pl.krakow.parking.repository.VehicleRepository;

@Service
public class AdminUserService {

    private static final char[] PASSWORD_CHARS =
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%".toCharArray();
    private static final int TEMPORARY_PASSWORD_LENGTH = 14;

    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    public AdminUserService(
        UserRepository userRepository,
        VehicleRepository vehicleRepository,
        PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.vehicleRepository = vehicleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<AdminUserSummaryResponse> getUsers() {
        return userRepository.findAllByOrderByIdAsc()
            .stream()
            .map(this::toSummaryResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public AdminUserDetailsResponse getUser(Long userId) {
        User user = getUserById(userId);
        List<UserVehicleResponse> vehicles = getUserVehicles(user).stream()
            .map(this::toVehicleResponse)
            .toList();

        return new AdminUserDetailsResponse(
            user.getId(),
            user.getFirstName(),
            user.getLastName(),
            user.getEmail(),
            user.getRole(),
            user.getStatus(),
            vehicles
        );
    }

    @Transactional
    public AdminUserDetailsResponse updateRole(Long userId, UserRoleUpdateRequest request, String adminEmail) {
        User user = getUserById(userId);
        if (isCurrentAdmin(user, adminEmail) && request.role() != UserRole.ADMIN) {
            throw new IllegalArgumentException("Administrator cannot remove own ADMIN role.");
        }

        user.setRole(request.role());
        return getUser(userRepository.save(user).getId());
    }

    @Transactional
    public AdminUserDetailsResponse updateStatus(Long userId, UserStatusUpdateRequest request, String adminEmail) {
        User user = getUserById(userId);
        if (isCurrentAdmin(user, adminEmail) && request.status() != UserStatus.ACTIVE) {
            throw new IllegalArgumentException("Administrator cannot block own account.");
        }

        user.setStatus(request.status());
        return getUser(userRepository.save(user).getId());
    }

    @Transactional
    public PasswordResetResponse resetPassword(Long userId) {
        User user = getUserById(userId);
        String temporaryPassword = generateTemporaryPassword();
        user.setPasswordHash(passwordEncoder.encode(temporaryPassword));
        userRepository.save(user);
        return new PasswordResetResponse(user.getId(), temporaryPassword);
    }

    private AdminUserSummaryResponse toSummaryResponse(User user) {
        List<Vehicle> vehicles = getUserVehicles(user);
        String activeVehicleRegistration = vehicles.stream()
            .filter(vehicle -> Boolean.TRUE.equals(vehicle.getActive()))
            .map(Vehicle::getRegistrationNumber)
            .findFirst()
            .orElse(null);

        return new AdminUserSummaryResponse(
            user.getId(),
            user.getFirstName(),
            user.getLastName(),
            user.getEmail(),
            user.getRole(),
            user.getStatus(),
            vehicles.size(),
            activeVehicleRegistration
        );
    }

    private List<Vehicle> getUserVehicles(User user) {
        return vehicleRepository.findByUserEmailIgnoreCaseOrderByActiveDescIdAsc(user.getEmail());
    }

    private UserVehicleResponse toVehicleResponse(Vehicle vehicle) {
        return new UserVehicleResponse(
            vehicle.getId(),
            vehicle.getBrand(),
            vehicle.getModel(),
            vehicle.getRegistrationNumber(),
            vehicle.getFuelType(),
            vehicle.getEmissionStandard(),
            vehicle.getProductionYear(),
            vehicle.getVehicleType(),
            vehicle.getSctCompliant(),
            vehicle.getActive()
        );
    }

    private User getUserById(Long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User %d was not found.".formatted(userId)));
    }

    private boolean isCurrentAdmin(User user, String adminEmail) {
        return user.getEmail().equalsIgnoreCase(adminEmail);
    }

    private String generateTemporaryPassword() {
        StringBuilder password = new StringBuilder(TEMPORARY_PASSWORD_LENGTH);
        for (int index = 0; index < TEMPORARY_PASSWORD_LENGTH; index++) {
            password.append(PASSWORD_CHARS[secureRandom.nextInt(PASSWORD_CHARS.length)]);
        }
        return password.toString();
    }
}

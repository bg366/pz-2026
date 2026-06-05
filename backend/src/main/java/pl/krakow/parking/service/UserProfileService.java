package pl.krakow.parking.service;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.krakow.parking.dto.UserProfileResponse;
import pl.krakow.parking.dto.UserProfileUpdateRequest;
import pl.krakow.parking.dto.UserVehicleRequest;
import pl.krakow.parking.dto.UserVehicleResponse;
import pl.krakow.parking.exception.ResourceNotFoundException;
import pl.krakow.parking.model.ParkingZone;
import pl.krakow.parking.model.User;
import pl.krakow.parking.model.Vehicle;
import pl.krakow.parking.repository.UserRepository;
import pl.krakow.parking.repository.VehicleRepository;

@Service
public class UserProfileService {

    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final SctVerificationService sctVerificationService;

    public UserProfileService(
        UserRepository userRepository,
        VehicleRepository vehicleRepository,
        SctVerificationService sctVerificationService
    ) {
        this.userRepository = userRepository;
        this.vehicleRepository = vehicleRepository;
        this.sctVerificationService = sctVerificationService;
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(String email) {
        return toProfileResponse(getUser(email));
    }

    @Transactional
    public UserProfileResponse updateProfile(String email, UserProfileUpdateRequest request) {
        User user = getUser(email);
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        return toProfileResponse(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public List<UserVehicleResponse> getVehicles(String email) {
        return vehicleRepository.findByUserEmailIgnoreCaseOrderByActiveDescIdAsc(email)
            .stream()
            .map(this::toVehicleResponse)
            .toList();
    }

    @Transactional
    public UserVehicleResponse createVehicle(String email, UserVehicleRequest request) {
        if (vehicleRepository.existsByUserEmailIgnoreCaseAndRegistrationNumberIgnoreCase(
            email,
            normalizeRegistration(request.registrationNumber())
        )) {
            throw new IllegalArgumentException("Vehicle with this registration number already exists.");
        }

        User user = getUser(email);
        Vehicle vehicle = Vehicle.builder()
            .user(user)
            .brand(request.brand())
            .model(request.model())
            .registrationNumber(normalizeRegistration(request.registrationNumber()))
            .fuelType(request.fuelType())
            .emissionStandard(request.emissionStandard())
            .productionYear(request.productionYear())
            .vehicleType(request.vehicleType())
            .sctCompliant(sctVerificationService.canEnter(
                request.fuelType(),
                request.emissionStandard(),
                ParkingZone.ZONE_A
            ))
            .active(Boolean.TRUE.equals(request.active()))
            .build();

        if (vehicle.getActive()) {
            deactivateVehicles(email);
        }

        return toVehicleResponse(vehicleRepository.save(vehicle));
    }

    @Transactional
    public UserVehicleResponse updateVehicle(String email, Long vehicleId, UserVehicleRequest request) {
        Vehicle vehicle = getUserVehicle(email, vehicleId);
        String normalizedRegistration = normalizeRegistration(request.registrationNumber());
        if (vehicleRepository.existsByUserEmailIgnoreCaseAndRegistrationNumberIgnoreCaseAndIdNot(
            email,
            normalizedRegistration,
            vehicleId
        )) {
            throw new IllegalArgumentException("Vehicle with this registration number already exists.");
        }

        vehicle.setBrand(request.brand());
        vehicle.setModel(request.model());
        vehicle.setRegistrationNumber(normalizedRegistration);
        vehicle.setFuelType(request.fuelType());
        vehicle.setEmissionStandard(request.emissionStandard());
        vehicle.setProductionYear(request.productionYear());
        vehicle.setVehicleType(request.vehicleType());
        vehicle.setSctCompliant(sctVerificationService.canEnter(
            request.fuelType(),
            request.emissionStandard(),
            ParkingZone.ZONE_A
        ));

        if (Boolean.TRUE.equals(request.active())) {
            deactivateVehicles(email);
            vehicle.setActive(true);
        }

        return toVehicleResponse(vehicleRepository.save(vehicle));
    }

    @Transactional
    public void deleteVehicle(String email, Long vehicleId) {
        vehicleRepository.delete(getUserVehicle(email, vehicleId));
    }

    @Transactional
    public UserVehicleResponse setActiveVehicle(String email, Long vehicleId) {
        Vehicle vehicle = getUserVehicle(email, vehicleId);
        deactivateVehicles(email);
        vehicle.setActive(true);
        return toVehicleResponse(vehicleRepository.save(vehicle));
    }

    private void deactivateVehicles(String email) {
        vehicleRepository.findByUserEmailIgnoreCaseOrderByActiveDescIdAsc(email)
            .forEach(vehicle -> vehicle.setActive(false));
    }

    private User getUser(String email) {
        return userRepository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new ResourceNotFoundException("User %s was not found.".formatted(email)));
    }

    private Vehicle getUserVehicle(String email, Long vehicleId) {
        return vehicleRepository.findByIdAndUserEmailIgnoreCase(vehicleId, email)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Vehicle %d was not found for current user.".formatted(vehicleId)
            ));
    }

    private String normalizeRegistration(String registrationNumber) {
        return registrationNumber.toUpperCase().replaceAll("\\s+", "");
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
}

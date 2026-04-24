package pl.krakow.parking.service;

import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.krakow.parking.dto.VehicleCheckRequest;
import pl.krakow.parking.dto.VehicleCheckResponse;
import pl.krakow.parking.exception.ResourceNotFoundException;
import pl.krakow.parking.model.EmissionStandard;
import pl.krakow.parking.model.FuelType;
import pl.krakow.parking.model.ParkingZone;
import pl.krakow.parking.model.SctRule;
import pl.krakow.parking.model.Vehicle;
import pl.krakow.parking.repository.SctRuleRepository;
import pl.krakow.parking.repository.VehicleRepository;

@Service
public class SctVerificationService {

    private final SctRuleRepository sctRuleRepository;
    private final VehicleRepository vehicleRepository;

    public SctVerificationService(SctRuleRepository sctRuleRepository, VehicleRepository vehicleRepository) {
        this.sctRuleRepository = sctRuleRepository;
        this.vehicleRepository = vehicleRepository;
    }

    @Transactional(readOnly = true)
    public VehicleCheckResponse checkVehicle(VehicleCheckRequest request) {
        ResolvedVehicle resolvedVehicle = resolveVehicle(request);
        return evaluate(resolvedVehicle.fuelType(), resolvedVehicle.emissionStandard(), request.zone());
    }

    @Transactional(readOnly = true)
    public boolean canEnter(FuelType fuelType, EmissionStandard emissionStandard, ParkingZone zone) {
        return evaluate(fuelType, emissionStandard, zone).canEnter();
    }

    private ResolvedVehicle resolveVehicle(VehicleCheckRequest request) {
        FuelType fuelType = request.fuelType();
        EmissionStandard emissionStandard = request.emissionStandard();

        if (request.registrationNumber() != null && (!hasFuelAndEmission(fuelType, emissionStandard))) {
            Vehicle vehicle = vehicleRepository.findByRegistrationNumberIgnoreCase(request.registrationNumber())
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Vehicle with registration number %s was not found.".formatted(request.registrationNumber())
                ));
            fuelType = vehicle.getFuelType();
            emissionStandard = vehicle.getEmissionStandard();
        }

        if (!hasFuelAndEmission(fuelType, emissionStandard)) {
            return new ResolvedVehicle(null, null);
        }

        return new ResolvedVehicle(fuelType, emissionStandard);
    }

    private boolean hasFuelAndEmission(FuelType fuelType, EmissionStandard emissionStandard) {
        return fuelType != null && emissionStandard != null;
    }

    private VehicleCheckResponse evaluate(FuelType fuelType, EmissionStandard emissionStandard, ParkingZone zone) {
        if (!hasFuelAndEmission(fuelType, emissionStandard)) {
            return new VehicleCheckResponse(
                false,
                "Provide registrationNumber or both fuelType and emissionStandard."
            );
        }

        List<SctRule> activeRules = sctRuleRepository.findActiveRules(zone, fuelType, LocalDate.now());
        if (activeRules.isEmpty()) {
            return new VehicleCheckResponse(true, "No active SCT restriction was found for the selected zone.");
        }

        SctRule rule = activeRules.getFirst();
        if (Boolean.FALSE.equals(rule.getAllowed())) {
            return new VehicleCheckResponse(false, "Entry is not allowed for this fuel type in the selected zone.");
        }

        if (fuelType == FuelType.ELECTRIC || emissionStandard == EmissionStandard.ELECTRIC) {
            return new VehicleCheckResponse(true, "Vehicle is electric, so entry is allowed.");
        }

        if (emissionStandard.isAtLeast(rule.getMinEmissionStandard())) {
            return new VehicleCheckResponse(
                true,
                "Pojazd z normą %s %s spełnia wymagania SCT strefy %s."
                    .formatted(formatEmission(emissionStandard), formatFuel(fuelType), formatZone(zone))
            );
        }

        return new VehicleCheckResponse(
            false,
            "Pojazd z normą %s %s nie spełnia wymagań SCT strefy %s. Wymagane minimum: %s."
                .formatted(
                    formatEmission(emissionStandard),
                    formatFuel(fuelType),
                    formatZone(zone),
                    formatEmission(rule.getMinEmissionStandard())
                )
        );
    }

    private String formatFuel(FuelType fuelType) {
        return switch (fuelType) {
            case PETROL -> "Benzyna";
            case DIESEL -> "Diesel";
            case LPG -> "LPG";
            case HYBRID -> "Hybrid";
            case ELECTRIC -> "Electric";
        };
    }

    private String formatEmission(EmissionStandard emissionStandard) {
        return emissionStandard.name().replace('_', ' ');
    }

    private String formatZone(ParkingZone zone) {
        return zone.name().replace("ZONE_", "");
    }

    private record ResolvedVehicle(FuelType fuelType, EmissionStandard emissionStandard) {
    }
}

package pl.krakow.parking.controller;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.krakow.parking.dto.VehicleCheckRequest;
import pl.krakow.parking.dto.VehicleCheckResponse;
import pl.krakow.parking.service.SctVerificationService;

@RestController
@RequestMapping("/api/vehicles")
public class VehicleCheckController {

    private final SctVerificationService sctVerificationService;

    public VehicleCheckController(SctVerificationService sctVerificationService) {
        this.sctVerificationService = sctVerificationService;
    }

    @PostMapping("/check")
    public VehicleCheckResponse check(@Valid @RequestBody VehicleCheckRequest request) {
        return sctVerificationService.checkVehicle(request);
    }
}

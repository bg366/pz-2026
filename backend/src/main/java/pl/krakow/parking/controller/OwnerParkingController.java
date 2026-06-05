package pl.krakow.parking.controller;

import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.krakow.parking.dto.OccupancyUpdateRequest;
import pl.krakow.parking.dto.ParkingLotResponse;
import pl.krakow.parking.dto.ParkingLotUpdateRequest;
import pl.krakow.parking.dto.ParkingSpotRequest;
import pl.krakow.parking.dto.ParkingSpotResponse;
import pl.krakow.parking.service.ParkingLotService;

@Validated
@RestController
@RequestMapping("/api/owner/parking-lots")
public class OwnerParkingController {

    private final ParkingLotService parkingLotService;

    public OwnerParkingController(ParkingLotService parkingLotService) {
        this.parkingLotService = parkingLotService;
    }

    @GetMapping
    public List<ParkingLotResponse> getMyParkingLots(Principal principal) {
        return parkingLotService.findAllByOwner(principal.getName());
    }

    @GetMapping("/{id}")
    public ParkingLotResponse getById(@PathVariable Long id, Principal principal) {
        return parkingLotService.findByIdForOwner(id, principal.getName());
    }

    @PutMapping("/{id}")
    public ParkingLotResponse update(
        @PathVariable Long id,
        @Valid @RequestBody ParkingLotUpdateRequest request,
        Principal principal
    ) {
        return parkingLotService.updateForOwner(id, request, principal.getName());
    }

    @PatchMapping("/{id}/occupancy")
    public ParkingLotResponse updateOccupancy(
        @PathVariable Long id,
        @Valid @RequestBody OccupancyUpdateRequest request,
        Principal principal
    ) {
        return parkingLotService.updateOccupancyForOwner(id, request, principal.getName());
    }

    @GetMapping("/{id}/spots")
    public List<ParkingSpotResponse> getSpots(@PathVariable Long id, Principal principal) {
        parkingLotService.findByIdForOwner(id, principal.getName());
        return parkingLotService.getSpotConfiguration(id);
    }

    @PutMapping("/{id}/spots")
    public ParkingLotResponse replaceSpots(
        @PathVariable Long id,
        @Valid @RequestBody List<ParkingSpotRequest> requests,
        Principal principal
    ) {
        return parkingLotService.replaceSpotsForOwner(id, requests, principal.getName());
    }
}

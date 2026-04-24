package pl.krakow.parking.controller;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.krakow.parking.dto.OccupancyUpdateRequest;
import pl.krakow.parking.dto.ParkingLotCreateRequest;
import pl.krakow.parking.dto.ParkingLotResponse;
import pl.krakow.parking.dto.ParkingLotUpdateRequest;
import pl.krakow.parking.service.ParkingLotService;

@Validated
@RestController
@RequestMapping("/api/admin/parking-lots")
public class AdminParkingController {

    private final ParkingLotService parkingLotService;

    public AdminParkingController(ParkingLotService parkingLotService) {
        this.parkingLotService = parkingLotService;
    }

    @GetMapping
    public Page<ParkingLotResponse> getAll(Pageable pageable) {
        return parkingLotService.findAll(pageable);
    }

    @GetMapping("/{id}")
    public ParkingLotResponse getById(@PathVariable Long id) {
        return parkingLotService.findById(id);
    }

    @PostMapping
    public ParkingLotResponse create(@Valid @RequestBody ParkingLotCreateRequest request) {
        return parkingLotService.create(request);
    }

    @PutMapping("/{id}")
    public ParkingLotResponse update(@PathVariable Long id, @Valid @RequestBody ParkingLotUpdateRequest request) {
        return parkingLotService.update(id, request);
    }

    @PatchMapping("/{id}/occupancy")
    public ParkingLotResponse updateOccupancy(
        @PathVariable Long id,
        @Valid @RequestBody OccupancyUpdateRequest request
    ) {
        return parkingLotService.updateOccupancy(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        parkingLotService.delete(id);
    }
}

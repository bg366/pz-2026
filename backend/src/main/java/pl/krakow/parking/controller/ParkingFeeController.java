package pl.krakow.parking.controller;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pl.krakow.parking.dto.ParkingFeeResponse;
import pl.krakow.parking.service.ParkingFeeService;

@Validated
@RestController
@RequestMapping("/api/parking-fee")
public class ParkingFeeController {

    private final ParkingFeeService parkingFeeService;

    public ParkingFeeController(ParkingFeeService parkingFeeService) {
        this.parkingFeeService = parkingFeeService;
    }

    @GetMapping("/calculate")
    public ParkingFeeResponse calculate(
        @RequestParam @NotNull Long parkingLotId,
        @RequestParam @NotNull @Min(1) Integer durationMinutes
    ) {
        return parkingFeeService.calculateFee(parkingLotId, durationMinutes);
    }
}

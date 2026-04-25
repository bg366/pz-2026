package pl.krakow.parking.controller;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pl.krakow.parking.dto.ParkingSearchRequest;
import pl.krakow.parking.dto.ParkingSearchResponse;
import pl.krakow.parking.dto.TariffResponse;
import pl.krakow.parking.model.EmissionStandard;
import pl.krakow.parking.model.FuelType;
import pl.krakow.parking.service.ParkingLotService;
import pl.krakow.parking.service.TariffService;

@Validated
@RestController
@RequestMapping("/api")
public class PublicParkingController {

    private final ParkingLotService parkingLotService;
    private final TariffService tariffService;

    public PublicParkingController(ParkingLotService parkingLotService, TariffService tariffService) {
        this.parkingLotService = parkingLotService;
        this.tariffService = tariffService;
    }

    @GetMapping("/parking-lots/search")
    public List<ParkingSearchResponse> search(
        @RequestParam @DecimalMin("-90.0") @DecimalMax("90.0") double lat,
        @RequestParam @DecimalMin("-180.0") @DecimalMax("180.0") double lng,
        @RequestParam(defaultValue = "5") @DecimalMin("0.1") double radiusKm,
        @RequestParam(required = false) FuelType fuelType,
        @RequestParam(required = false) EmissionStandard emissionStandard,
        @RequestParam(required = false) @DecimalMin("0.0") BigDecimal maxPricePerHour
    ) {
        return parkingLotService.searchNearby(
            new ParkingSearchRequest(lat, lng, radiusKm, fuelType, emissionStandard, maxPricePerHour)
        );
    }

    @GetMapping("/tariffs/{parkingLotId}")
    public List<TariffResponse> getTariffs(@PathVariable Long parkingLotId) {
        return tariffService.getTariffsForParkingLot(parkingLotId);
    }
}

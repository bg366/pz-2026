package pl.krakow.parking.controller;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.krakow.parking.dto.PriceResponse;
import pl.krakow.parking.dto.PriceUpsertRequest;
import pl.krakow.parking.model.ParkingZone;
import pl.krakow.parking.service.PriceService;

@RestController
@RequestMapping("/api/admin")
public class AdminPriceController {

    private final PriceService priceService;

    public AdminPriceController(PriceService priceService) {
        this.priceService = priceService;
    }

    @PutMapping("/prices/zones/{zone}")
    public PriceResponse updateZonePrice(
        @PathVariable ParkingZone zone,
        @Valid @RequestBody PriceUpsertRequest request
    ) {
        return priceService.upsertZonePrice(zone, request);
    }

    @PutMapping("/parking-lots/{parkingLotId}/price")
    public PriceResponse updateParkingPrice(
        @PathVariable Long parkingLotId,
        @Valid @RequestBody PriceUpsertRequest request
    ) {
        return priceService.upsertParkingPrice(parkingLotId, request);
    }

    @DeleteMapping("/parking-lots/{parkingLotId}/price")
    public void deleteParkingPrice(@PathVariable Long parkingLotId) {
        priceService.deleteParkingPrice(parkingLotId);
    }
}

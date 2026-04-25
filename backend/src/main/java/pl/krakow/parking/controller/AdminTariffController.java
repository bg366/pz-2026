package pl.krakow.parking.controller;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.krakow.parking.dto.TariffResponse;
import pl.krakow.parking.dto.TariffUpsertRequest;
import pl.krakow.parking.service.TariffService;

@Validated
@RestController
@RequestMapping("/api/admin/parking-lots/{parkingLotId}/tariffs")
public class AdminTariffController {

    private final TariffService tariffService;

    public AdminTariffController(TariffService tariffService) {
        this.tariffService = tariffService;
    }

    @GetMapping
    public List<TariffResponse> getByParkingLot(@PathVariable Long parkingLotId) {
        return tariffService.getTariffsForParkingLot(parkingLotId);
    }

    @PostMapping
    public TariffResponse create(@PathVariable Long parkingLotId, @Valid @RequestBody TariffUpsertRequest request) {
        return tariffService.createTariff(parkingLotId, request);
    }

    @PutMapping("/{tariffId}")
    public TariffResponse update(
        @PathVariable Long parkingLotId,
        @PathVariable Long tariffId,
        @Valid @RequestBody TariffUpsertRequest request
    ) {
        return tariffService.updateTariff(parkingLotId, tariffId, request);
    }

    @DeleteMapping("/{tariffId}")
    public void delete(@PathVariable Long parkingLotId, @PathVariable Long tariffId) {
        tariffService.deleteTariff(parkingLotId, tariffId);
    }
}

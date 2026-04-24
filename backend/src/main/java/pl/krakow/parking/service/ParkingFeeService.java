package pl.krakow.parking.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.krakow.parking.dto.ParkingFeeResponse;
import pl.krakow.parking.model.Tariff;

@Service
public class ParkingFeeService {

    private final TariffService tariffService;

    public ParkingFeeService(TariffService tariffService) {
        this.tariffService = tariffService;
    }

    @Transactional(readOnly = true)
    public ParkingFeeResponse calculateFee(Long parkingLotId, Integer durationMinutes) {
        Tariff tariff = tariffService.getPrimaryTariff(parkingLotId);
        long billedHours = (long) Math.ceil(durationMinutes / 60.0d);
        BigDecimal amount = tariff.getPricePerHour()
            .multiply(BigDecimal.valueOf(billedHours))
            .setScale(2, RoundingMode.HALF_UP);

        return new ParkingFeeResponse(parkingLotId, durationMinutes, amount, tariff.getCurrency());
    }
}

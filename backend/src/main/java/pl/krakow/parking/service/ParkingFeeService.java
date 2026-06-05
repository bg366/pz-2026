package pl.krakow.parking.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.krakow.parking.dto.ParkingFeeBreakdownItem;
import pl.krakow.parking.dto.ParkingFeeResponse;
import pl.krakow.parking.exception.ResourceNotFoundException;
import pl.krakow.parking.model.ParkingLot;
import pl.krakow.parking.model.Price;
import pl.krakow.parking.repository.ParkingLotRepository;
import pl.krakow.parking.repository.PriceRepository;

@Service
public class ParkingFeeService {

    private static final String CURRENCY = "PLN";

    private final ParkingLotRepository parkingLotRepository;
    private final PriceRepository priceRepository;

    public ParkingFeeService(ParkingLotRepository parkingLotRepository, PriceRepository priceRepository) {
        this.parkingLotRepository = parkingLotRepository;
        this.priceRepository = priceRepository;
    }

    @Transactional(readOnly = true)
    public ParkingFeeResponse calculateFee(Long parkingLotId, Integer durationMinutes) {
        ParkingLot parkingLot = parkingLotRepository.findById(parkingLotId)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Parking lot with id %d was not found.".formatted(parkingLotId)
            ));
        Price price = priceRepository.findByParkingLotId(parkingLot.getId())
            .or(() -> priceRepository.findByZoneCode(parkingLot.getZone()))
            .orElseThrow(() -> new ResourceNotFoundException(
                "No price table found for parking lot %d or zone %s."
                    .formatted(parkingLot.getId(), parkingLot.getZone())
            ));

        long billedHours = (long) Math.ceil(durationMinutes / 60.0d);
        List<ParkingFeeBreakdownItem> breakdown = buildHourlyBreakdown(price, billedHours);
        BigDecimal hourlyAmount = sumBreakdown(breakdown);
        BigDecimal dailyAmount = price.getDailyPrice()
            .multiply(BigDecimal.valueOf((long) Math.ceil(billedHours / 24.0d)))
            .setScale(2, RoundingMode.HALF_UP);

        boolean dailyIsCheaper = dailyAmount.compareTo(hourlyAmount) < 0;
        BigDecimal selectedAmount = dailyIsCheaper ? dailyAmount : hourlyAmount;
        String selectedPricingMode = dailyIsCheaper ? "DAILY" : "HOURLY";

        return new ParkingFeeResponse(
            parkingLotId,
            durationMinutes,
            selectedAmount,
            CURRENCY,
            hourlyAmount,
            dailyAmount,
            selectedPricingMode,
            breakdown
        );
    }

    private List<ParkingFeeBreakdownItem> buildHourlyBreakdown(Price price, long billedHours) {
        List<ParkingFeeBreakdownItem> breakdown = new ArrayList<>();
        addHourBreakdown(breakdown, "FIRST_HOUR", billedHours, 1, price.getFirstHourPrice());
        addHourBreakdown(breakdown, "SECOND_HOUR", billedHours, 2, price.getSecondHourPrice());
        addHourBreakdown(breakdown, "THIRD_HOUR", billedHours, 3, price.getThirdHourPrice());

        if (billedHours > 3) {
            int nextHours = Math.toIntExact(billedHours - 3);
            BigDecimal amount = price.getNextHourPrice()
                .multiply(BigDecimal.valueOf(nextHours))
                .setScale(2, RoundingMode.HALF_UP);
            breakdown.add(new ParkingFeeBreakdownItem(
                "NEXT_HOURS",
                nextHours,
                price.getNextHourPrice(),
                amount
            ));
        }

        return breakdown;
    }

    private void addHourBreakdown(
        List<ParkingFeeBreakdownItem> breakdown,
        String label,
        long billedHours,
        int hourNumber,
        BigDecimal price
    ) {
        if (billedHours < hourNumber) {
            return;
        }

        breakdown.add(new ParkingFeeBreakdownItem(label, 1, price, price.setScale(2, RoundingMode.HALF_UP)));
    }

    private BigDecimal sumBreakdown(List<ParkingFeeBreakdownItem> breakdown) {
        return breakdown.stream()
            .map(ParkingFeeBreakdownItem::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP);
    }
}

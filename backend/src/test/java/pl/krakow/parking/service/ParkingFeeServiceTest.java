package pl.krakow.parking.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pl.krakow.parking.dto.ParkingFeeResponse;
import pl.krakow.parking.model.ParkingLot;
import pl.krakow.parking.model.ParkingZone;
import pl.krakow.parking.model.Price;
import pl.krakow.parking.model.Zone;
import pl.krakow.parking.repository.ParkingLotRepository;
import pl.krakow.parking.repository.PriceRepository;

@ExtendWith(MockitoExtension.class)
class ParkingFeeServiceTest {

    private static final GeometryFactory GEOMETRY_FACTORY = new GeometryFactory(new PrecisionModel(), 4326);

    @Mock
    private ParkingLotRepository parkingLotRepository;

    @Mock
    private PriceRepository priceRepository;

    @Test
    void shouldCalculateFeeUsingFirstSecondThirdAndNextHourPrices() {
        given(parkingLotRepository.findById(1L)).willReturn(Optional.of(parkingLot(ParkingZone.ZONE_A)));
        given(priceRepository.findByZoneCode(ParkingZone.ZONE_A)).willReturn(Optional.of(price(
            ParkingZone.ZONE_A,
            6,
            7,
            8,
            6,
            55
        )));

        ParkingFeeService service = new ParkingFeeService(parkingLotRepository, priceRepository);

        ParkingFeeResponse response = service.calculateFee(1L, 240);

        assertThat(response.amount()).isEqualByComparingTo("27.00");
        assertThat(response.hourlyAmount()).isEqualByComparingTo("27.00");
        assertThat(response.dailyAmount()).isEqualByComparingTo("55.00");
        assertThat(response.selectedPricingMode()).isEqualTo("HOURLY");
        assertThat(response.breakdown()).hasSize(4);
        assertThat(response.breakdown().get(3).label()).isEqualTo("NEXT_HOURS");
        assertThat(response.breakdown().get(3).hours()).isEqualTo(1);
    }

    @Test
    void shouldChooseDailyPriceWhenItIsCheaperThanHourlyPrice() {
        given(parkingLotRepository.findById(1L)).willReturn(Optional.of(parkingLot(ParkingZone.ZONE_A)));
        given(priceRepository.findByZoneCode(ParkingZone.ZONE_A)).willReturn(Optional.of(price(
            ParkingZone.ZONE_A,
            6,
            7,
            8,
            6,
            55
        )));

        ParkingFeeService service = new ParkingFeeService(parkingLotRepository, priceRepository);

        ParkingFeeResponse response = service.calculateFee(1L, 600);

        assertThat(response.hourlyAmount()).isEqualByComparingTo("63.00");
        assertThat(response.dailyAmount()).isEqualByComparingTo("55.00");
        assertThat(response.amount()).isEqualByComparingTo("55.00");
        assertThat(response.selectedPricingMode()).isEqualTo("DAILY");
    }

    @Test
    void shouldUseParkingSpecificPriceBeforeZonePrice() {
        given(parkingLotRepository.findById(1L)).willReturn(Optional.of(parkingLot(ParkingZone.ZONE_A)));
        given(priceRepository.findByParkingLotId(1L)).willReturn(Optional.of(price(
            ParkingZone.ZONE_A,
            10,
            10,
            10,
            10,
            90
        )));

        ParkingFeeService service = new ParkingFeeService(parkingLotRepository, priceRepository);

        ParkingFeeResponse response = service.calculateFee(1L, 120);

        assertThat(response.amount()).isEqualByComparingTo("20.00");
        assertThat(response.hourlyAmount()).isEqualByComparingTo("20.00");
    }

    private ParkingLot parkingLot(ParkingZone zone) {
        return ParkingLot.builder()
            .id(1L)
            .name("Parking testowy")
            .address("ul. Testowa 1")
            .zone(zone)
            .location(GEOMETRY_FACTORY.createPoint(new Coordinate(19.9370, 50.0615)))
            .totalSpots(100)
            .occupiedSpots(20)
            .parkingType("PUBLIC")
            .build();
    }

    private Price price(
        ParkingZone zoneCode,
        int firstHour,
        int secondHour,
        int thirdHour,
        int nextHour,
        int daily
    ) {
        return Price.builder()
            .zone(Zone.builder().code(zoneCode).name(zoneCode.name()).build())
            .firstHourPrice(BigDecimal.valueOf(firstHour))
            .secondHourPrice(BigDecimal.valueOf(secondHour))
            .thirdHourPrice(BigDecimal.valueOf(thirdHour))
            .nextHourPrice(BigDecimal.valueOf(nextHour))
            .dailyPrice(BigDecimal.valueOf(daily))
            .build();
    }
}

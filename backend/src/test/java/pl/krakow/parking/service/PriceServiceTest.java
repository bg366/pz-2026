package pl.krakow.parking.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
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
import pl.krakow.parking.dto.PriceResponse;
import pl.krakow.parking.dto.PriceUpsertRequest;
import pl.krakow.parking.model.ParkingLot;
import pl.krakow.parking.model.ParkingZone;
import pl.krakow.parking.model.Price;
import pl.krakow.parking.model.Zone;
import pl.krakow.parking.repository.ParkingLotRepository;
import pl.krakow.parking.repository.PriceRepository;
import pl.krakow.parking.repository.ZoneRepository;

@ExtendWith(MockitoExtension.class)
class PriceServiceTest {

    private static final GeometryFactory GEOMETRY_FACTORY = new GeometryFactory(new PrecisionModel(), 4326);

    @Mock
    private PriceRepository priceRepository;

    @Mock
    private ZoneRepository zoneRepository;

    @Mock
    private ParkingLotRepository parkingLotRepository;

    @Test
    void shouldUpdateZonePrice() {
        Zone zone = Zone.builder().id(1L).code(ParkingZone.ZONE_A).name("Zone A").build();
        Price existingPrice = Price.builder().id(10L).zone(zone).build();
        PriceUpsertRequest request = request(6, 7, 8, 6, 55);

        given(zoneRepository.findByCode(ParkingZone.ZONE_A)).willReturn(Optional.of(zone));
        given(priceRepository.findByZoneCode(ParkingZone.ZONE_A)).willReturn(Optional.of(existingPrice));
        given(priceRepository.save(any(Price.class))).willAnswer(invocation -> invocation.getArgument(0));

        PriceService service = new PriceService(priceRepository, zoneRepository, parkingLotRepository);

        PriceResponse response = service.upsertZonePrice(ParkingZone.ZONE_A, request);

        assertThat(response.zone()).isEqualTo(ParkingZone.ZONE_A);
        assertThat(response.parkingLotId()).isNull();
        assertThat(response.firstHourPrice()).isEqualByComparingTo("6");
        assertThat(response.dailyPrice()).isEqualByComparingTo("55");
    }

    @Test
    void shouldCreateParkingSpecificPrice() {
        ParkingLot parkingLot = parkingLot();
        PriceUpsertRequest request = request(8, 8, 8, 7, 70);

        given(parkingLotRepository.findById(2L)).willReturn(Optional.of(parkingLot));
        given(priceRepository.findByParkingLotId(2L)).willReturn(Optional.empty());
        given(priceRepository.save(any(Price.class))).willAnswer(invocation -> {
            Price price = invocation.getArgument(0);
            price.setId(20L);
            return price;
        });

        PriceService service = new PriceService(priceRepository, zoneRepository, parkingLotRepository);

        PriceResponse response = service.upsertParkingPrice(2L, request);

        assertThat(response.zone()).isNull();
        assertThat(response.parkingLotId()).isEqualTo(2L);
        assertThat(response.nextHourPrice()).isEqualByComparingTo("7");
        assertThat(response.dailyPrice()).isEqualByComparingTo("70");
    }

    private PriceUpsertRequest request(int firstHour, int secondHour, int thirdHour, int nextHour, int daily) {
        return new PriceUpsertRequest(
            BigDecimal.valueOf(firstHour),
            BigDecimal.valueOf(secondHour),
            BigDecimal.valueOf(thirdHour),
            BigDecimal.valueOf(nextHour),
            BigDecimal.valueOf(daily)
        );
    }

    private ParkingLot parkingLot() {
        return ParkingLot.builder()
            .id(2L)
            .name("Parking prywatny")
            .address("ul. Testowa 2")
            .zone(ParkingZone.ZONE_B)
            .location(GEOMETRY_FACTORY.createPoint(new Coordinate(19.9370, 50.0615)))
            .totalSpots(100)
            .occupiedSpots(10)
            .parkingType("PRIVATE")
            .build();
    }
}

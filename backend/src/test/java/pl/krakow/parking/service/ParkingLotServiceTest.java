package pl.krakow.parking.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pl.krakow.parking.dto.ParkingSearchRequest;
import pl.krakow.parking.dto.ParkingSearchResponse;
import pl.krakow.parking.mapper.ParkingLotMapper;
import pl.krakow.parking.mapper.ParkingSpotMapper;
import pl.krakow.parking.model.EmissionStandard;
import pl.krakow.parking.model.FuelType;
import pl.krakow.parking.model.ParkingLot;
import pl.krakow.parking.model.ParkingLotStatus;
import pl.krakow.parking.model.ParkingZone;
import pl.krakow.parking.repository.ParkingLotRepository;
import pl.krakow.parking.repository.PriceRepository;

@ExtendWith(MockitoExtension.class)
class ParkingLotServiceTest {

    private static final GeometryFactory GEOMETRY_FACTORY = new GeometryFactory(new PrecisionModel(), 4326);

    @Mock
    private ParkingLotRepository parkingLotRepository;

    @Mock
    private PriceRepository priceRepository;

    @Mock
    private ParkingLotMapper parkingLotMapper;

    @Mock
    private ParkingSpotMapper parkingSpotMapper;

    @Mock
    private SctVerificationService sctVerificationService;

    @Test
    void shouldNotReturnInactiveParkingLotsInPublicSearch() {
        ParkingLot activeParking = parkingLot(1L, "Aktywny", ParkingLotStatus.ACTIVE);
        ParkingLot inactiveParking = parkingLot(2L, "Nieaktywny", ParkingLotStatus.INACTIVE);

        given(parkingLotRepository.findNearby(50.0615, 19.9370, 5000.0d))
            .willReturn(List.of(activeParking, inactiveParking));
        given(priceRepository.findByParkingLotId(1L)).willReturn(Optional.empty());
        given(priceRepository.findByZoneCode(ParkingZone.ZONE_A)).willReturn(Optional.empty());

        ParkingLotService service = new ParkingLotService(
            parkingLotRepository,
            priceRepository,
            parkingLotMapper,
            parkingSpotMapper,
            sctVerificationService
        );

        List<ParkingSearchResponse> responses = service.searchNearby(
            new ParkingSearchRequest(50.0615, 19.9370, 5, null, null, null)
        );

        assertThat(responses).extracting(ParkingSearchResponse::name).containsExactly("Aktywny");
    }

    @Test
    void shouldNotRecommendParkingWhenVehicleFailsSctAndNoSctSpotsAreAvailable() {
        ParkingLot parkingLot = parkingLot(1L, "Bez SCT", ParkingLotStatus.ACTIVE, 0, 0);

        given(parkingLotRepository.findNearby(50.0615, 19.9370, 5000.0d)).willReturn(List.of(parkingLot));
        given(priceRepository.findByParkingLotId(1L)).willReturn(Optional.empty());
        given(priceRepository.findByZoneCode(ParkingZone.ZONE_A)).willReturn(Optional.empty());
        given(sctVerificationService.canEnter(FuelType.DIESEL, EmissionStandard.EURO_3, ParkingZone.ZONE_A))
            .willReturn(false);

        ParkingLotService service = new ParkingLotService(
            parkingLotRepository,
            priceRepository,
            parkingLotMapper,
            parkingSpotMapper,
            sctVerificationService
        );

        List<ParkingSearchResponse> responses = service.searchNearby(
            new ParkingSearchRequest(50.0615, 19.9370, 5, FuelType.DIESEL, EmissionStandard.EURO_3, null)
        );

        assertThat(responses).isEmpty();
    }

    private ParkingLot parkingLot(Long id, String name, ParkingLotStatus status) {
        return parkingLot(id, name, status, 10, 2);
    }

    private ParkingLot parkingLot(
        Long id,
        String name,
        ParkingLotStatus status,
        int totalSctSpots,
        int occupiedSctSpots
    ) {
        return ParkingLot.builder()
            .id(id)
            .name(name)
            .address("ul. Testowa")
            .description("Opis")
            .status(status)
            .zone(ParkingZone.ZONE_A)
            .location(GEOMETRY_FACTORY.createPoint(new Coordinate(19.9370, 50.0615)))
            .totalSpots(100)
            .occupiedSpots(25)
            .totalSctSpots(totalSctSpots)
            .occupiedSctSpots(occupiedSctSpots)
            .openingHours("24/7")
            .parkingType("PUBLIC")
            .build();
    }
}

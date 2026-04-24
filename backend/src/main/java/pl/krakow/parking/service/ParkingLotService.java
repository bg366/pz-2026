package pl.krakow.parking.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalTime;
import java.util.List;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.krakow.parking.dto.OccupancyUpdateRequest;
import pl.krakow.parking.dto.ParkingLotCreateRequest;
import pl.krakow.parking.dto.ParkingLotResponse;
import pl.krakow.parking.dto.ParkingLotUpdateRequest;
import pl.krakow.parking.dto.ParkingSearchRequest;
import pl.krakow.parking.dto.ParkingSearchResponse;
import pl.krakow.parking.exception.ResourceNotFoundException;
import pl.krakow.parking.mapper.ParkingLotMapper;
import pl.krakow.parking.model.ParkingLot;
import pl.krakow.parking.model.ParkingZone;
import pl.krakow.parking.model.Tariff;
import pl.krakow.parking.repository.ParkingLotRepository;

@Service
public class ParkingLotService {

    private static final GeometryFactory GEOMETRY_FACTORY = new GeometryFactory(new PrecisionModel(), 4326);

    private final ParkingLotRepository parkingLotRepository;
    private final ParkingLotMapper parkingLotMapper;
    private final SctVerificationService sctVerificationService;

    public ParkingLotService(
        ParkingLotRepository parkingLotRepository,
        ParkingLotMapper parkingLotMapper,
        SctVerificationService sctVerificationService
    ) {
        this.parkingLotRepository = parkingLotRepository;
        this.parkingLotMapper = parkingLotMapper;
        this.sctVerificationService = sctVerificationService;
    }

    @Transactional(readOnly = true)
    public Page<ParkingLotResponse> findAll(Pageable pageable) {
        return parkingLotRepository.findAll(pageable).map(parkingLotMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public ParkingLotResponse findById(Long id) {
        return parkingLotMapper.toResponse(getParkingLotEntity(id));
    }

    @Transactional
    public ParkingLotResponse create(ParkingLotCreateRequest request) {
        ParkingLot parkingLot = parkingLotMapper.toEntity(request);
        parkingLot.setLocation(createPoint(request.longitude(), request.latitude()));
        parkingLot.setOccupiedSpots(0);
        parkingLot.addTariff(defaultTariff(parkingLot));
        return parkingLotMapper.toResponse(parkingLotRepository.save(parkingLot));
    }

    @Transactional
    public ParkingLotResponse update(Long id, ParkingLotUpdateRequest request) {
        ParkingLot parkingLot = getParkingLotEntity(id);
        parkingLotMapper.updateParkingLot(request, parkingLot);
        parkingLot.setLocation(createPoint(request.longitude(), request.latitude()));
        if (parkingLot.getOccupiedSpots() > parkingLot.getTotalSpots()) {
            parkingLot.setOccupiedSpots(parkingLot.getTotalSpots());
        }
        return parkingLotMapper.toResponse(parkingLotRepository.save(parkingLot));
    }

    @Transactional
    public ParkingLotResponse updateOccupancy(Long id, OccupancyUpdateRequest request) {
        ParkingLot parkingLot = getParkingLotEntity(id);
        parkingLot.setOccupiedSpots(Math.min(request.occupiedSpots(), parkingLot.getTotalSpots()));
        return parkingLotMapper.toResponse(parkingLotRepository.save(parkingLot));
    }

    @Transactional
    public void delete(Long id) {
        ParkingLot parkingLot = getParkingLotEntity(id);
        parkingLotRepository.delete(parkingLot);
    }

    @Transactional(readOnly = true)
    public List<ParkingSearchResponse> searchNearby(ParkingSearchRequest request) {
        return parkingLotRepository.findNearby(request.lat(), request.lng(), request.radiusKm() * 1000.0d)
            .stream()
            .map(parkingLot -> toSearchResponse(parkingLot, request))
            .toList();
    }

    private ParkingSearchResponse toSearchResponse(ParkingLot parkingLot, ParkingSearchRequest request) {
        Tariff tariff = parkingLot.getTariffs().stream().findFirst().orElse(null);
        boolean sctAllowed = request.fuelType() == null || request.emissionStandard() == null
            || sctVerificationService.canEnter(request.fuelType(), request.emissionStandard(), parkingLot.getZone());

        BigDecimal pricePerHour = tariff != null ? tariff.getPricePerHour() : null;
        String currency = tariff != null ? tariff.getCurrency() : null;

        return new ParkingSearchResponse(
            parkingLot.getId(),
            parkingLot.getName(),
            parkingLot.getAddress(),
            parkingLot.getZone(),
            parkingLot.getLocation().getY(),
            parkingLot.getLocation().getX(),
            calculateDistanceKm(request.lat(), request.lng(), parkingLot.getLocation()),
            sctAllowed,
            parkingLot.getTotalSpots() - parkingLot.getOccupiedSpots(),
            pricePerHour,
            currency,
            parkingLot.getParkingType()
        );
    }

    private ParkingLot getParkingLotEntity(Long id) {
        return parkingLotRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Parking lot with id %d was not found.".formatted(id)));
    }

    private Point createPoint(Double longitude, Double latitude) {
        Point point = GEOMETRY_FACTORY.createPoint(new Coordinate(longitude, latitude));
        point.setSRID(4326);
        return point;
    }

    private Tariff defaultTariff(ParkingLot parkingLot) {
        return Tariff.builder()
            .parkingLot(parkingLot)
            .zone(parkingLot.getZone())
            .dayOfWeek(null)
            .hourFrom(LocalTime.of(0, 0))
            .hourTo(LocalTime.of(23, 59))
            .pricePerHour(defaultRate(parkingLot.getZone()))
            .currency("PLN")
            .build();
    }

    private BigDecimal defaultRate(ParkingZone zone) {
        return switch (zone) {
            case ZONE_A -> BigDecimal.valueOf(6);
            case ZONE_B -> BigDecimal.valueOf(4);
            case ZONE_C -> BigDecimal.valueOf(2);
        };
    }

    private double calculateDistanceKm(double fromLat, double fromLng, Point target) {
        double earthRadiusKm = 6371.0d;
        double latDistance = Math.toRadians(target.getY() - fromLat);
        double lngDistance = Math.toRadians(target.getX() - fromLng);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
            + Math.cos(Math.toRadians(fromLat))
            * Math.cos(Math.toRadians(target.getY()))
            * Math.sin(lngDistance / 2)
            * Math.sin(lngDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return BigDecimal.valueOf(earthRadiusKm * c).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }
}

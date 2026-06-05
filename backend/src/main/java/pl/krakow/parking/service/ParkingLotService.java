package pl.krakow.parking.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
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
import pl.krakow.parking.dto.ParkingSpotRequest;
import pl.krakow.parking.dto.ParkingSpotResponse;
import pl.krakow.parking.dto.ParkingLotUpdateRequest;
import pl.krakow.parking.dto.ParkingSearchRequest;
import pl.krakow.parking.dto.ParkingSearchResponse;
import pl.krakow.parking.dto.PriceResponse;
import org.springframework.security.access.AccessDeniedException;
import pl.krakow.parking.exception.ResourceNotFoundException;
import pl.krakow.parking.mapper.ParkingLotMapper;
import pl.krakow.parking.mapper.ParkingSpotMapper;
import pl.krakow.parking.model.ParkingLot;
import pl.krakow.parking.model.ParkingLotStatus;
import pl.krakow.parking.model.ParkingPermission;
import pl.krakow.parking.model.ParkingOccupancyHistory;
import pl.krakow.parking.model.ParkingSpot;
import pl.krakow.parking.model.Price;
import pl.krakow.parking.model.SpotCategory;
import pl.krakow.parking.model.User;
import pl.krakow.parking.repository.ParkingLotRepository;
import pl.krakow.parking.repository.ParkingOccupancyHistoryRepository;
import pl.krakow.parking.repository.PriceRepository;
import pl.krakow.parking.repository.UserRepository;

@Service
public class ParkingLotService {

    private static final GeometryFactory GEOMETRY_FACTORY = new GeometryFactory(new PrecisionModel(), 4326);
    private static final String CURRENCY = "PLN";

    private final ParkingLotRepository parkingLotRepository;
    private final PriceRepository priceRepository;
    private final ParkingOccupancyHistoryRepository occupancyHistoryRepository;
    private final UserRepository userRepository;
    private final ParkingLotMapper parkingLotMapper;
    private final ParkingSpotMapper parkingSpotMapper;
    private final SctVerificationService sctVerificationService;

    public ParkingLotService(
        ParkingLotRepository parkingLotRepository,
        PriceRepository priceRepository,
        ParkingOccupancyHistoryRepository occupancyHistoryRepository,
        UserRepository userRepository,
        ParkingLotMapper parkingLotMapper,
        ParkingSpotMapper parkingSpotMapper,
        SctVerificationService sctVerificationService
    ) {
        this.parkingLotRepository = parkingLotRepository;
        this.priceRepository = priceRepository;
        this.occupancyHistoryRepository = occupancyHistoryRepository;
        this.userRepository = userRepository;
        this.parkingLotMapper = parkingLotMapper;
        this.parkingSpotMapper = parkingSpotMapper;
        this.sctVerificationService = sctVerificationService;
    }

    @Transactional(readOnly = true)
    public Page<ParkingLotResponse> findAll(Pageable pageable) {
        return parkingLotRepository.findAll(pageable).map(this::toParkingLotResponse);
    }

    @Transactional(readOnly = true)
    public ParkingLotResponse findById(Long id) {
        return toParkingLotResponse(getParkingLotEntity(id));
    }

    @Transactional
    public ParkingLotResponse create(ParkingLotCreateRequest request) {
        validateSctOccupancy(request.totalSctSpots(), 0);
        ParkingLot parkingLot = parkingLotMapper.toEntity(request);
        parkingLot.setLocation(createPoint(request.longitude(), request.latitude()));
        parkingLot.setOccupiedSpots(0);
        return toParkingLotResponse(parkingLotRepository.save(parkingLot));
    }

    @Transactional
    public ParkingLotResponse update(Long id, ParkingLotUpdateRequest request) {
        validateSctOccupancy(request.totalSctSpots(), request.occupiedSctSpots());
        ParkingLot parkingLot = getParkingLotEntity(id);
        parkingLotMapper.updateParkingLot(request, parkingLot);
        parkingLot.setLocation(createPoint(request.longitude(), request.latitude()));
        if (parkingLot.getOccupiedSpots() > parkingLot.getTotalSpots()) {
            parkingLot.setOccupiedSpots(parkingLot.getTotalSpots());
        }
        return toParkingLotResponse(parkingLotRepository.save(parkingLot));
    }

    @Transactional
    public ParkingLotResponse updateOccupancy(Long id, OccupancyUpdateRequest request) {
        ParkingLot parkingLot = getParkingLotEntity(id);
        parkingLot.setOccupiedSpots(Math.min(request.occupiedSpots(), parkingLot.getTotalSpots()));
        ParkingLot savedParkingLot = parkingLotRepository.save(parkingLot);
        recordOccupancy(savedParkingLot);
        return toParkingLotResponse(savedParkingLot);
    }

    @Transactional
    public void delete(Long id) {
        ParkingLot parkingLot = getParkingLotEntity(id);
        parkingLotRepository.delete(parkingLot);
    }

    @Transactional(readOnly = true)
    public List<ParkingLotResponse> findAllByOwner(String ownerEmail) {
        return parkingLotRepository.findByOwnerEmailIgnoreCaseOrderByIdAsc(ownerEmail).stream()
            .map(this::toParkingLotResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public ParkingLotResponse findByIdForOwner(Long id, String ownerEmail) {
        ParkingLot parkingLot = getParkingLotEntity(id);
        checkOwnership(parkingLot, ownerEmail);
        return toParkingLotResponse(parkingLot);
    }

    @Transactional
    public ParkingLotResponse updateForOwner(Long id, ParkingLotUpdateRequest request, String ownerEmail) {
        validateSctOccupancy(request.totalSctSpots(), request.occupiedSctSpots());
        ParkingLot parkingLot = getParkingLotEntity(id);
        checkOwnership(parkingLot, ownerEmail);
        parkingLotMapper.updateParkingLot(request, parkingLot);
        parkingLot.setLocation(createPoint(request.longitude(), request.latitude()));
        if (parkingLot.getOccupiedSpots() > parkingLot.getTotalSpots()) {
            parkingLot.setOccupiedSpots(parkingLot.getTotalSpots());
        }
        return toParkingLotResponse(parkingLotRepository.save(parkingLot));
    }

    @Transactional
    public ParkingLotResponse updateOccupancyForOwner(Long id, OccupancyUpdateRequest request, String ownerEmail) {
        ParkingLot parkingLot = getParkingLotEntity(id);
        checkOwnership(parkingLot, ownerEmail);
        parkingLot.setOccupiedSpots(Math.min(request.occupiedSpots(), parkingLot.getTotalSpots()));
        ParkingLot savedParkingLot = parkingLotRepository.save(parkingLot);
        recordOccupancy(savedParkingLot);
        return toParkingLotResponse(savedParkingLot);
    }

    @Transactional
    public ParkingLotResponse replaceSpotsForOwner(Long id, List<ParkingSpotRequest> requests, String ownerEmail) {
        ParkingLot parkingLot = getParkingLotEntity(id);
        checkOwnership(parkingLot, ownerEmail);
        return doReplaceSpots(parkingLot, requests);
    }

    @Transactional
    public ParkingLotResponse assignOwner(Long parkingLotId, Long ownerId) {
        ParkingLot parkingLot = getParkingLotEntity(parkingLotId);
        if (ownerId == null) {
            parkingLot.setOwner(null);
        } else {
            User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("User %d was not found.".formatted(ownerId)));
            parkingLot.setOwner(owner);
        }
        return toParkingLotResponse(parkingLotRepository.save(parkingLot));
    }

    @Transactional(readOnly = true)
    public List<ParkingSearchResponse> searchNearby(ParkingSearchRequest request) {
        return parkingLotRepository.findNearby(request.lat(), request.lng(), request.radiusKm() * 1000.0d)
            .stream()
            .filter(parkingLot -> parkingLot.getStatus() == ParkingLotStatus.ACTIVE)
            .filter(parkingLot -> matchesName(parkingLot, request.name()))
            .filter(parkingLot -> request.zone() == null || parkingLot.getZone() == request.zone())
            .filter(parkingLot -> !request.openNow() || !"CLOSED".equalsIgnoreCase(parkingLot.getOpeningHours()))
            .map(parkingLot -> toSearchResponse(parkingLot, request))
            .filter(response -> response.parkingPermission() != ParkingPermission.NOT_ALLOWED)
            .filter(response -> matchesPrice(response, request.maxPricePerHour()))
            .filter(response -> !request.onlyAvailable() || response.availableSpots() > 0)
            .sorted(searchComparator(request))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ParkingSpotResponse> getSpotConfiguration(Long id) {
        ParkingLot parkingLot = getParkingLotEntity(id);
        return parkingSpotMapper.toResponses(
            parkingLot.getSpots().stream()
                .sorted(Comparator.comparing(ParkingSpot::getCategory))
                .toList()
        );
    }

    @Transactional
    public ParkingLotResponse replaceSpotConfiguration(Long id, List<ParkingSpotRequest> requests) {
        return doReplaceSpots(getParkingLotEntity(id), requests);
    }

    private ParkingLotResponse doReplaceSpots(ParkingLot parkingLot, List<ParkingSpotRequest> requests) {
        parkingLot.getSpots().clear();

        int totalSpots = 0;
        int occupiedSpots = 0;
        int totalSctSpots = 0;
        int occupiedSctSpots = 0;

        for (ParkingSpotRequest request : requests) {
            if (request.occupied() > request.total()) {
                throw new IllegalArgumentException(
                    "Occupied spots cannot exceed total spots for category %s.".formatted(request.category())
                );
            }

            ParkingSpot spot = ParkingSpot.builder()
                .category(request.category())
                .total(request.total())
                .occupied(request.occupied())
                .build();
            parkingLot.addSpot(spot);
            totalSpots += request.total();
            occupiedSpots += request.occupied();
            if (request.category() == SpotCategory.SCT_READY) {
                totalSctSpots += request.total();
                occupiedSctSpots += request.occupied();
            }
        }

        parkingLot.setTotalSpots(totalSpots);
        parkingLot.setOccupiedSpots(occupiedSpots);
        parkingLot.setTotalSctSpots(totalSctSpots);
        parkingLot.setOccupiedSctSpots(occupiedSctSpots);
        ParkingLot savedParkingLot = parkingLotRepository.save(parkingLot);
        recordOccupancy(savedParkingLot);
        return toParkingLotResponse(savedParkingLot);
    }

    private ParkingSearchResponse toSearchResponse(ParkingLot parkingLot, ParkingSearchRequest request) {
        Price price = findEffectivePrice(parkingLot);
        boolean sctAllowed = request.fuelType() == null || request.emissionStandard() == null
            || sctVerificationService.canEnter(request.fuelType(), request.emissionStandard(), parkingLot.getZone());
        int availableSpots = parkingLot.getTotalSpots() - parkingLot.getOccupiedSpots();
        int availableSctSpots = parkingLot.getTotalSctSpots() - parkingLot.getOccupiedSctSpots();
        int availableRegularSpots = availableSpots - availableSctSpots;
        ParkingDecision parkingDecision = resolveParkingPermission(request, sctAllowed, availableSctSpots);

        BigDecimal pricePerHour = price != null ? price.getFirstHourPrice() : null;
        String currency = price != null ? CURRENCY : null;
        PredictedCost predictedCost = predictCost(price, request.durationMinutes());

        return new ParkingSearchResponse(
            parkingLot.getId(),
            parkingLot.getName(),
            parkingLot.getAddress(),
            parkingLot.getDescription(),
            parkingLot.getStatus(),
            parkingLot.getZone(),
            parkingLot.getLocation().getY(),
            parkingLot.getLocation().getX(),
            calculateDistanceKm(request.lat(), request.lng(), parkingLot.getLocation()),
            sctAllowed,
            availableSpots,
            Math.max(availableRegularSpots, 0),
            availableSctSpots,
            parkingDecision.permission(),
            parkingDecision.reason(),
            parkingLot.getOpeningHours(),
            predictedCost.amount(),
            predictedCost.pricingMode(),
            pricePerHour,
            currency,
            parkingLot.getParkingType()
        );
    }

    private ParkingLotResponse toParkingLotResponse(ParkingLot parkingLot) {
        User owner = parkingLot.getOwner();
        return new ParkingLotResponse(
            parkingLot.getId(),
            parkingLot.getName(),
            parkingLot.getAddress(),
            parkingLot.getDescription(),
            parkingLot.getStatus(),
            parkingLot.getZone(),
            parkingLot.getLocation() != null ? parkingLot.getLocation().getY() : null,
            parkingLot.getLocation() != null ? parkingLot.getLocation().getX() : null,
            parkingLot.getTotalSpots(),
            parkingLot.getOccupiedSpots(),
            parkingLot.getTotalSctSpots(),
            parkingLot.getOccupiedSctSpots(),
            parkingLot.getOpeningHours(),
            parkingLot.getParkingType(),
            parkingSpotMapper.toResponses(parkingLot.getSpots().stream()
                .sorted(Comparator.comparing(ParkingSpot::getCategory))
                .toList()),
            toPriceResponse(findEffectivePrice(parkingLot)),
            owner != null ? owner.getId() : null,
            owner != null ? owner.getEmail() : null
        );
    }

    private void checkOwnership(ParkingLot parkingLot, String ownerEmail) {
        if (parkingLot.getOwner() == null
                || !parkingLot.getOwner().getEmail().equalsIgnoreCase(ownerEmail)) {
            throw new AccessDeniedException(
                "You are not the owner of parking lot %d.".formatted(parkingLot.getId())
            );
        }
    }

    private PriceResponse toPriceResponse(Price price) {
        if (price == null) {
            return null;
        }

        return new PriceResponse(
            price.getId(),
            price.getZone() != null ? price.getZone().getCode() : null,
            price.getParkingLot() != null ? price.getParkingLot().getId() : null,
            price.getFirstHourPrice(),
            price.getSecondHourPrice(),
            price.getThirdHourPrice(),
            price.getNextHourPrice(),
            price.getDailyPrice(),
            CURRENCY
        );
    }

    private Price findEffectivePrice(ParkingLot parkingLot) {
        return priceRepository.findByParkingLotId(parkingLot.getId())
            .or(() -> priceRepository.findByZoneCode(parkingLot.getZone()))
            .orElse(null);
    }

    private boolean matchesPrice(ParkingSearchResponse response, BigDecimal maxPricePerHour) {
        if (maxPricePerHour == null || response.pricePerHour() == null) {
            return true;
        }
        return response.pricePerHour().compareTo(maxPricePerHour) <= 0;
    }

    private boolean matchesName(ParkingLot parkingLot, String name) {
        if (name == null || name.isBlank()) {
            return true;
        }
        return parkingLot.getName().toLowerCase().contains(name.toLowerCase());
    }

    private Comparator<ParkingSearchResponse> searchComparator(ParkingSearchRequest request) {
        return switch (request.sort()) {
            case PRICE -> Comparator.comparing(
                ParkingSearchResponse::pricePerHour,
                Comparator.nullsLast(BigDecimal::compareTo)
            );
            case AVAILABLE_SPOTS -> Comparator.comparing(ParkingSearchResponse::availableSpots).reversed();
            case DISTANCE -> Comparator.comparing(ParkingSearchResponse::distanceKm);
        };
    }

    private PredictedCost predictCost(Price price, Integer durationMinutes) {
        if (price == null || durationMinutes == null || durationMinutes <= 0) {
            return new PredictedCost(null, null);
        }

        long billedHours = (long) Math.ceil(durationMinutes / 60.0d);
        BigDecimal hourlyAmount = BigDecimal.ZERO;
        if (billedHours >= 1) {
            hourlyAmount = hourlyAmount.add(price.getFirstHourPrice());
        }
        if (billedHours >= 2) {
            hourlyAmount = hourlyAmount.add(price.getSecondHourPrice());
        }
        if (billedHours >= 3) {
            hourlyAmount = hourlyAmount.add(price.getThirdHourPrice());
        }
        if (billedHours > 3) {
            hourlyAmount = hourlyAmount.add(price.getNextHourPrice().multiply(BigDecimal.valueOf(billedHours - 3)));
        }
        hourlyAmount = hourlyAmount.setScale(2, RoundingMode.HALF_UP);

        BigDecimal dailyAmount = price.getDailyPrice()
            .multiply(BigDecimal.valueOf((long) Math.ceil(billedHours / 24.0d)))
            .setScale(2, RoundingMode.HALF_UP);

        if (dailyAmount.compareTo(hourlyAmount) < 0) {
            return new PredictedCost(dailyAmount, "DAILY");
        }
        return new PredictedCost(hourlyAmount, "HOURLY");
    }

    private ParkingDecision resolveParkingPermission(
        ParkingSearchRequest request,
        boolean sctAllowed,
        int availableSctSpots
    ) {
        if (request.fuelType() == null || request.emissionStandard() == null) {
            return new ParkingDecision(ParkingPermission.ALL_SPOTS, "No vehicle SCT data was provided.");
        }

        if (sctAllowed) {
            return new ParkingDecision(ParkingPermission.ALL_SPOTS, "Vehicle meets SCT requirements.");
        }

        if (availableSctSpots > 0) {
            return new ParkingDecision(
                ParkingPermission.SCT_SPOTS_ONLY,
                "Vehicle does not meet general SCT requirements; only designated SCT spots are available."
            );
        }

        return new ParkingDecision(
            ParkingPermission.NOT_ALLOWED,
            "Vehicle does not meet SCT requirements and there are no designated SCT spots available."
        );
    }

    private record ParkingDecision(ParkingPermission permission, String reason) {
    }

    private record PredictedCost(BigDecimal amount, String pricingMode) {
    }

    private void validateSctOccupancy(Integer totalSctSpots, Integer occupiedSctSpots) {
        if (occupiedSctSpots > totalSctSpots) {
            throw new IllegalArgumentException("Occupied SCT spots cannot exceed total SCT spots.");
        }
    }

    private void recordOccupancy(ParkingLot parkingLot) {
        occupancyHistoryRepository.save(ParkingOccupancyHistory.builder()
            .parkingLot(parkingLot)
            .occupiedSpots(parkingLot.getOccupiedSpots())
            .occupiedSctSpots(parkingLot.getOccupiedSctSpots())
            .recordedAt(java.time.LocalDateTime.now())
            .build());
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

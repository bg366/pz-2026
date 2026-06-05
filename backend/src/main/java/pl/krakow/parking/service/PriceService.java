package pl.krakow.parking.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.AccessDeniedException;
import pl.krakow.parking.dto.PriceResponse;
import pl.krakow.parking.dto.PriceUpsertRequest;
import pl.krakow.parking.exception.ResourceNotFoundException;
import pl.krakow.parking.model.ParkingLot;
import pl.krakow.parking.model.ParkingZone;
import pl.krakow.parking.model.Price;
import pl.krakow.parking.model.Zone;
import pl.krakow.parking.repository.ParkingLotRepository;
import pl.krakow.parking.repository.PriceRepository;
import pl.krakow.parking.repository.ZoneRepository;

@Service
public class PriceService {

    private static final String CURRENCY = "PLN";

    private final PriceRepository priceRepository;
    private final ZoneRepository zoneRepository;
    private final ParkingLotRepository parkingLotRepository;

    public PriceService(
        PriceRepository priceRepository,
        ZoneRepository zoneRepository,
        ParkingLotRepository parkingLotRepository
    ) {
        this.priceRepository = priceRepository;
        this.zoneRepository = zoneRepository;
        this.parkingLotRepository = parkingLotRepository;
    }

    @Transactional
    public PriceResponse upsertZonePrice(ParkingZone zoneCode, PriceUpsertRequest request) {
        Zone zone = zoneRepository.findByCode(zoneCode)
            .orElseThrow(() -> new ResourceNotFoundException("Zone %s was not found.".formatted(zoneCode)));
        Price price = priceRepository.findByZoneCode(zoneCode)
            .orElseGet(() -> Price.builder().zone(zone).build());

        applyRequest(price, request);
        return toResponse(priceRepository.save(price));
    }

    @Transactional
    public PriceResponse upsertParkingPrice(Long parkingLotId, PriceUpsertRequest request) {
        ParkingLot parkingLot = parkingLotRepository.findById(parkingLotId)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Parking lot with id %d was not found.".formatted(parkingLotId)
            ));
        Price price = priceRepository.findByParkingLotId(parkingLotId)
            .orElseGet(() -> Price.builder().parkingLot(parkingLot).build());

        applyRequest(price, request);
        return toResponse(priceRepository.save(price));
    }

    @Transactional
    public PriceResponse upsertParkingPriceForOwner(Long parkingLotId, String ownerEmail, PriceUpsertRequest request) {
        ParkingLot parkingLot = parkingLotRepository.findById(parkingLotId)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Parking lot with id %d was not found.".formatted(parkingLotId)
            ));
        if (parkingLot.getOwner() == null || !parkingLot.getOwner().getEmail().equalsIgnoreCase(ownerEmail)) {
            throw new AccessDeniedException("You are not the owner of parking lot %d.".formatted(parkingLotId));
        }
        Price price = priceRepository.findByParkingLotId(parkingLotId)
            .orElseGet(() -> Price.builder().parkingLot(parkingLot).build());

        applyRequest(price, request);
        return toResponse(priceRepository.save(price));
    }

    @Transactional
    public void deleteParkingPrice(Long parkingLotId) {
        Price price = priceRepository.findByParkingLotId(parkingLotId)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Parking-specific price for parking lot %d was not found.".formatted(parkingLotId)
            ));
        priceRepository.delete(price);
    }

    private void applyRequest(Price price, PriceUpsertRequest request) {
        price.setFirstHourPrice(request.firstHourPrice());
        price.setSecondHourPrice(request.secondHourPrice());
        price.setThirdHourPrice(request.thirdHourPrice());
        price.setNextHourPrice(request.nextHourPrice());
        price.setDailyPrice(request.dailyPrice());
    }

    public PriceResponse toResponse(Price price) {
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
}

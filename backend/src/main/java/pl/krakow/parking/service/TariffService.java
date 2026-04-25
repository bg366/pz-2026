package pl.krakow.parking.service;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.krakow.parking.dto.TariffResponse;
import pl.krakow.parking.dto.TariffUpsertRequest;
import pl.krakow.parking.exception.ResourceNotFoundException;
import pl.krakow.parking.mapper.TariffMapper;
import pl.krakow.parking.model.ParkingLot;
import pl.krakow.parking.model.Tariff;
import pl.krakow.parking.repository.ParkingLotRepository;
import pl.krakow.parking.repository.TariffRepository;

@Service
public class TariffService {

    private final TariffRepository tariffRepository;
    private final ParkingLotRepository parkingLotRepository;
    private final TariffMapper tariffMapper;

    public TariffService(
        TariffRepository tariffRepository,
        ParkingLotRepository parkingLotRepository,
        TariffMapper tariffMapper
    ) {
        this.tariffRepository = tariffRepository;
        this.parkingLotRepository = parkingLotRepository;
        this.tariffMapper = tariffMapper;
    }

    @Transactional(readOnly = true)
    public List<TariffResponse> getTariffsForParkingLot(Long parkingLotId) {
        if (!parkingLotRepository.existsById(parkingLotId)) {
            throw new ResourceNotFoundException("Parking lot with id %d was not found.".formatted(parkingLotId));
        }
        return tariffMapper.toResponses(tariffRepository.findByParkingLotIdOrderByIdAsc(parkingLotId));
    }

    @Transactional(readOnly = true)
    public Tariff getPrimaryTariff(Long parkingLotId) {
        return tariffRepository.findByParkingLotIdOrderByIdAsc(parkingLotId)
            .stream()
            .findFirst()
            .orElseThrow(() -> new ResourceNotFoundException(
                "No tariff found for parking lot with id %d.".formatted(parkingLotId)
            ));
    }

    @Transactional
    public TariffResponse createTariff(Long parkingLotId, TariffUpsertRequest request) {
        ParkingLot parkingLot = getParkingLot(parkingLotId);
        Tariff tariff = Tariff.builder()
            .parkingLot(parkingLot)
            .zone(request.zone())
            .dayOfWeek(request.dayOfWeek())
            .hourFrom(request.hourFrom())
            .hourTo(request.hourTo())
            .pricePerHour(request.pricePerHour())
            .currency(request.currency())
            .build();
        return tariffMapper.toResponse(tariffRepository.save(tariff));
    }

    @Transactional
    public TariffResponse updateTariff(Long parkingLotId, Long tariffId, TariffUpsertRequest request) {
        ParkingLot parkingLot = getParkingLot(parkingLotId);
        Tariff tariff = getTariff(tariffId);
        if (!tariff.getParkingLot().getId().equals(parkingLot.getId())) {
            throw new ResourceNotFoundException(
                "Tariff %d does not belong to parking lot %d.".formatted(tariffId, parkingLotId)
            );
        }

        tariff.setZone(request.zone());
        tariff.setDayOfWeek(request.dayOfWeek());
        tariff.setHourFrom(request.hourFrom());
        tariff.setHourTo(request.hourTo());
        tariff.setPricePerHour(request.pricePerHour());
        tariff.setCurrency(request.currency());

        return tariffMapper.toResponse(tariffRepository.save(tariff));
    }

    @Transactional
    public void deleteTariff(Long parkingLotId, Long tariffId) {
        ParkingLot parkingLot = getParkingLot(parkingLotId);
        Tariff tariff = getTariff(tariffId);
        if (!tariff.getParkingLot().getId().equals(parkingLot.getId())) {
            throw new ResourceNotFoundException(
                "Tariff %d does not belong to parking lot %d.".formatted(tariffId, parkingLotId)
            );
        }
        tariffRepository.delete(tariff);
    }

    private ParkingLot getParkingLot(Long parkingLotId) {
        return parkingLotRepository.findById(parkingLotId)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Parking lot with id %d was not found.".formatted(parkingLotId)
            ));
    }

    private Tariff getTariff(Long tariffId) {
        return tariffRepository.findById(tariffId)
            .orElseThrow(() -> new ResourceNotFoundException("Tariff with id %d was not found.".formatted(tariffId)));
    }
}

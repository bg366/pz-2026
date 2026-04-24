package pl.krakow.parking.service;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.krakow.parking.dto.TariffResponse;
import pl.krakow.parking.exception.ResourceNotFoundException;
import pl.krakow.parking.mapper.TariffMapper;
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
}

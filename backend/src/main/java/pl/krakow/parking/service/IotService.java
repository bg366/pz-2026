package pl.krakow.parking.service;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.krakow.parking.dto.IotDeviceResponse;
import pl.krakow.parking.dto.IotReadingRequest;
import pl.krakow.parking.dto.IotRegisterRequest;
import pl.krakow.parking.exception.ResourceNotFoundException;
import pl.krakow.parking.model.IotDevice;
import pl.krakow.parking.model.IotDeviceStatus;
import pl.krakow.parking.model.IotSensorReading;
import pl.krakow.parking.model.ParkingLot;
import pl.krakow.parking.repository.IotDeviceRepository;
import pl.krakow.parking.repository.IotSensorReadingRepository;
import pl.krakow.parking.repository.ParkingLotRepository;

@Service
public class IotService {

    private final IotDeviceRepository deviceRepository;
    private final IotSensorReadingRepository readingRepository;
    private final ParkingLotRepository parkingLotRepository;

    public IotService(
        IotDeviceRepository deviceRepository,
        IotSensorReadingRepository readingRepository,
        ParkingLotRepository parkingLotRepository
    ) {
        this.deviceRepository = deviceRepository;
        this.readingRepository = readingRepository;
        this.parkingLotRepository = parkingLotRepository;
    }

    public List<IotDeviceResponse> listDevices() {
        return deviceRepository.findAllByOrderByParkingLotIdAscExternalDeviceIdAsc()
            .stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public IotDeviceResponse registerDevice(IotRegisterRequest request) {
        ParkingLot parkingLot = parkingLotRepository.findById(request.parkingLotId())
            .orElseThrow(() -> new ResourceNotFoundException("Parking lot not found: " + request.parkingLotId()));

        if (deviceRepository.findByExternalDeviceId(request.externalDeviceId()).isPresent()) {
            throw new IllegalArgumentException("Device already registered: " + request.externalDeviceId());
        }

        IotDevice device = IotDevice.builder()
            .parkingLot(parkingLot)
            .externalDeviceId(request.externalDeviceId())
            .status(IotDeviceStatus.ACTIVE)
            .build();

        return toResponse(deviceRepository.save(device));
    }

    @Transactional
    public IotDeviceResponse processReading(IotReadingRequest request) {
        IotDevice device = deviceRepository.findByExternalDeviceId(request.deviceId())
            .orElseThrow(() -> new ResourceNotFoundException("IoT device not found: " + request.deviceId()));

        IotSensorReading reading = IotSensorReading.builder()
            .device(device)
            .occupiedSpots(request.occupiedSpots())
            .build();
        readingRepository.save(reading);

        ParkingLot parkingLot = device.getParkingLot();
        int clamped = Math.min(request.occupiedSpots(), parkingLot.getTotalSpots());
        parkingLot.setOccupiedSpots(clamped);
        parkingLotRepository.save(parkingLot);

        device.setLastSeenAt(LocalDateTime.now());
        device.setStatus(IotDeviceStatus.ACTIVE);
        return toResponse(deviceRepository.save(device));
    }

    private IotDeviceResponse toResponse(IotDevice d) {
        return new IotDeviceResponse(
            d.getId(),
            d.getParkingLot().getId(),
            d.getParkingLot().getName(),
            d.getExternalDeviceId(),
            d.getStatus(),
            d.getLastSeenAt(),
            d.getCreatedAt()
        );
    }
}

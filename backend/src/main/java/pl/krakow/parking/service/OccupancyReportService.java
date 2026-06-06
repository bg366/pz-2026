package pl.krakow.parking.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.krakow.parking.dto.OccupancyReportResponse;
import pl.krakow.parking.model.ParkingLot;
import pl.krakow.parking.model.ParkingOccupancyHistory;
import pl.krakow.parking.repository.ParkingLotRepository;
import pl.krakow.parking.repository.ParkingOccupancyHistoryRepository;

@Service
public class OccupancyReportService {

    private final ParkingLotRepository parkingLotRepository;
    private final ParkingOccupancyHistoryRepository historyRepository;

    public OccupancyReportService(
        ParkingLotRepository parkingLotRepository,
        ParkingOccupancyHistoryRepository historyRepository
    ) {
        this.parkingLotRepository = parkingLotRepository;
        this.historyRepository = historyRepository;
    }

    @Transactional(readOnly = true)
    public List<OccupancyReportResponse> current() {
        LocalDateTime now = LocalDateTime.now();
        return parkingLotRepository.findAll().stream()
            .map(parkingLot -> toResponse(parkingLot, parkingLot.getOccupiedSpots(), parkingLot.getOccupiedSctSpots(), now))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<OccupancyReportResponse> daily(LocalDate date, Long parkingLotId) {
        LocalDateTime from = date.atStartOfDay();
        return history(from, from.plusDays(1), parkingLotId);
    }

    @Transactional(readOnly = true)
    public List<OccupancyReportResponse> monthly(int year, int month, Long parkingLotId) {
        LocalDateTime from = LocalDate.of(year, month, 1).atStartOfDay();
        return history(from, from.plusMonths(1), parkingLotId);
    }

    private List<OccupancyReportResponse> history(LocalDateTime from, LocalDateTime to, Long parkingLotId) {
        List<ParkingOccupancyHistory> entries = parkingLotId == null
            ? historyRepository.findByRecordedAtBetweenOrderByRecordedAtAsc(from, to)
            : historyRepository.findByParkingLotIdAndRecordedAtBetweenOrderByRecordedAtAsc(parkingLotId, from, to);

        return entries.stream()
            .map(entry -> toResponse(
                entry.getParkingLot(),
                entry.getOccupiedSpots(),
                entry.getOccupiedSctSpots(),
                entry.getRecordedAt()
            ))
            .toList();
    }

    private OccupancyReportResponse toResponse(
        ParkingLot parkingLot,
        int occupiedSpots,
        int occupiedSctSpots,
        LocalDateTime recordedAt
    ) {
        int availableSpots = parkingLot.getTotalSpots() - occupiedSpots;
        int availableSctSpots = parkingLot.getTotalSctSpots() - occupiedSctSpots;
        double occupancyPercent = parkingLot.getTotalSpots() == 0
            ? 0
            : Math.round((occupiedSpots * 10000.0d) / parkingLot.getTotalSpots()) / 100.0d;

        return new OccupancyReportResponse(
            parkingLot.getId(),
            parkingLot.getName(),
            occupiedSpots,
            parkingLot.getTotalSpots(),
            availableSpots,
            occupiedSctSpots,
            parkingLot.getTotalSctSpots(),
            availableSctSpots,
            occupancyPercent,
            recordedAt
        );
    }
}

package pl.krakow.parking.repository;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import pl.krakow.parking.model.ParkingOccupancyHistory;

public interface ParkingOccupancyHistoryRepository extends JpaRepository<ParkingOccupancyHistory, Long> {

    List<ParkingOccupancyHistory> findByRecordedAtBetweenOrderByRecordedAtAsc(
        LocalDateTime from,
        LocalDateTime to
    );

    List<ParkingOccupancyHistory> findByParkingLotIdAndRecordedAtBetweenOrderByRecordedAtAsc(
        Long parkingLotId,
        LocalDateTime from,
        LocalDateTime to
    );
}

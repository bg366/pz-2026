package pl.krakow.parking.repository;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import pl.krakow.parking.model.Reservation;
import pl.krakow.parking.model.ReservationStatus;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    List<Reservation> findByUserEmailIgnoreCaseOrderByStartsAtDesc(String email);

    List<Reservation> findByStatusAndEndsAtBetween(ReservationStatus status, LocalDateTime from, LocalDateTime to);
}

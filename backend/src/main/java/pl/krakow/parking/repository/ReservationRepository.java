package pl.krakow.parking.repository;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pl.krakow.parking.model.Reservation;
import pl.krakow.parking.model.ReservationStatus;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    List<Reservation> findByUserEmailIgnoreCaseOrderByStartsAtDesc(String email);

    List<Reservation> findByStatusAndEndsAtBetween(ReservationStatus status, LocalDateTime from, LocalDateTime to);

    @Query("SELECT r FROM Reservation r WHERE UPPER(r.registrationNumber) = UPPER(:plate) " +
           "AND r.status = :status AND r.startsAt <= :now AND r.endsAt >= :now")
    List<Reservation> findCurrentlyActiveByVehiclePlate(
        @Param("plate") String plate,
        @Param("status") ReservationStatus status,
        @Param("now") LocalDateTime now
    );
}

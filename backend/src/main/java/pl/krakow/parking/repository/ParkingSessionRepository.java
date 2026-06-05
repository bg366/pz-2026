package pl.krakow.parking.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import pl.krakow.parking.model.ParkingSession;
import pl.krakow.parking.model.ParkingSessionStatus;

public interface ParkingSessionRepository extends JpaRepository<ParkingSession, Long> {

    Optional<ParkingSession> findByPaymentToken(String paymentToken);

    Optional<ParkingSession> findFirstByRegistrationNumberIgnoreCaseAndStatusIn(
        String registrationNumber,
        List<ParkingSessionStatus> statuses
    );

    List<ParkingSession> findByUserEmailIgnoreCaseOrderByStartedAtDesc(String email);

    List<ParkingSession> findByRegistrationNumberIgnoreCaseAndStatusIn(
        String registrationNumber,
        List<ParkingSessionStatus> statuses
    );
}

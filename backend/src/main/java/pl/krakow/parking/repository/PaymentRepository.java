package pl.krakow.parking.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import pl.krakow.parking.model.Payment;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByToken(String token);

    Optional<Payment> findByReservationId(Long reservationId);
}

package pl.krakow.parking.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import pl.krakow.parking.model.Notification;
import pl.krakow.parking.model.NotificationType;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserEmailIgnoreCaseOrderByCreatedAtDesc(String email);

    boolean existsByReservationIdAndType(Long reservationId, NotificationType type);
}

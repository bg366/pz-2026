package pl.krakow.parking.service;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.krakow.parking.dto.NotificationResponse;
import pl.krakow.parking.exception.ResourceNotFoundException;
import pl.krakow.parking.model.Notification;
import pl.krakow.parking.model.NotificationType;
import pl.krakow.parking.model.Reservation;
import pl.krakow.parking.model.ReservationStatus;
import pl.krakow.parking.repository.NotificationRepository;
import pl.krakow.parking.repository.ReservationRepository;

@Service
public class NotificationService {

    private static final int EXPIRY_WARN_MINUTES = 30;

    private final NotificationRepository notificationRepository;
    private final ReservationRepository reservationRepository;

    public NotificationService(
        NotificationRepository notificationRepository,
        ReservationRepository reservationRepository
    ) {
        this.notificationRepository = notificationRepository;
        this.reservationRepository = reservationRepository;
    }

    public List<NotificationResponse> listForUser(String email) {
        return notificationRepository.findByUserEmailIgnoreCaseOrderByCreatedAtDesc(email)
            .stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public NotificationResponse markRead(Long id, String email) {
        Notification notification = notificationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + id));

        if (!notification.getUser().getEmail().equalsIgnoreCase(email)) {
            throw new AccessDeniedException("This notification does not belong to you.");
        }

        notification.setRead(true);
        return toResponse(notificationRepository.save(notification));
    }

    @Scheduled(fixedDelay = 5 * 60 * 1000)
    @Transactional
    public void checkExpiringReservations() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime horizon = now.plusMinutes(EXPIRY_WARN_MINUTES);

        List<Reservation> expiring = reservationRepository
            .findByStatusAndEndsAtBetween(ReservationStatus.CONFIRMED, now, horizon);

        for (Reservation reservation : expiring) {
            if (notificationRepository.existsByReservationIdAndType(
                    reservation.getId(), NotificationType.RESERVATION_EXPIRING)) {
                continue;
            }

            long minutesLeft = java.time.Duration.between(now, reservation.getEndsAt()).toMinutes();
            String message = String.format(
                "Rezerwacja na parking \"%s\" kończy się za %d min (godz. %s).",
                reservation.getParkingLot().getName(),
                minutesLeft,
                reservation.getEndsAt().toLocalTime().withSecond(0).withNano(0)
            );

            Notification notification = Notification.builder()
                .user(reservation.getUser())
                .reservation(reservation)
                .type(NotificationType.RESERVATION_EXPIRING)
                .message(message)
                .read(false)
                .build();

            notificationRepository.save(notification);
        }
    }

    @Transactional
    public void createConfirmedNotification(Reservation reservation) {
        if (notificationRepository.existsByReservationIdAndType(
                reservation.getId(), NotificationType.RESERVATION_CONFIRMED)) {
            return;
        }
        String message = String.format(
            "Rezerwacja na parking \"%s\" (%s – %s) została potwierdzona. Dziękujemy za płatność!",
            reservation.getParkingLot().getName(),
            reservation.getStartsAt().toLocalDate(),
            reservation.getEndsAt().toLocalDate()
        );
        Notification notification = Notification.builder()
            .user(reservation.getUser())
            .reservation(reservation)
            .type(NotificationType.RESERVATION_CONFIRMED)
            .message(message)
            .read(false)
            .build();
        notificationRepository.save(notification);
    }

    private NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(
            n.getId(),
            n.getType(),
            n.getMessage(),
            n.isRead(),
            n.getReservation() != null ? n.getReservation().getId() : null,
            n.getCreatedAt()
        );
    }
}

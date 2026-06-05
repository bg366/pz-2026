package pl.krakow.parking.dto;

import java.time.LocalDateTime;
import pl.krakow.parking.model.NotificationType;

public record NotificationResponse(
    Long id,
    NotificationType type,
    String message,
    boolean read,
    Long reservationId,
    LocalDateTime createdAt
) {}

package pl.krakow.parking.dto;

import java.time.LocalDateTime;
import java.util.List;

public record PlateCheckResponse(
    String registrationNumber,
    boolean hasPaidSession,
    boolean hasActiveReservation,
    List<ActiveSession> activeSessions,
    List<ActiveReservation> activeReservations
) {
    public record ActiveSession(
        Long sessionId,
        String parkingLotName,
        LocalDateTime startedAt,
        LocalDateTime endedAt,
        String status,
        boolean expired
    ) {}

    public record ActiveReservation(
        Long reservationId,
        String parkingLotName,
        LocalDateTime startsAt,
        LocalDateTime endsAt,
        String status
    ) {}
}

package pl.krakow.parking.controller;

import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.krakow.parking.dto.CameraEntryRequest;
import pl.krakow.parking.dto.CameraEntryResponse;
import pl.krakow.parking.dto.ExitPaymentResponse;
import pl.krakow.parking.dto.PlateCheckResponse;
import pl.krakow.parking.model.ParkingAccessType;
import pl.krakow.parking.model.ParkingLot;
import pl.krakow.parking.model.ParkingSession;
import pl.krakow.parking.model.ParkingSessionStatus;
import pl.krakow.parking.model.ReservationStatus;
import pl.krakow.parking.repository.ParkingLotRepository;
import pl.krakow.parking.repository.ParkingSessionRepository;
import pl.krakow.parking.repository.ReservationRepository;
import pl.krakow.parking.service.ParkingFeeService;

@RestController
@RequestMapping("/api/inspect")
public class PlateCheckController {

    private final ParkingSessionRepository sessionRepository;
    private final ReservationRepository reservationRepository;
    private final ParkingLotRepository parkingLotRepository;
    private final ParkingFeeService parkingFeeService;

    public PlateCheckController(
        ParkingSessionRepository sessionRepository,
        ReservationRepository reservationRepository,
        ParkingLotRepository parkingLotRepository,
        ParkingFeeService parkingFeeService
    ) {
        this.sessionRepository = sessionRepository;
        this.reservationRepository = reservationRepository;
        this.parkingLotRepository = parkingLotRepository;
        this.parkingFeeService = parkingFeeService;
    }

    @PostMapping("/entry")
    public ResponseEntity<CameraEntryResponse> recordEntry(@RequestBody @Valid CameraEntryRequest request) {
        String plate = request.registrationNumber().toUpperCase().replaceAll("\\s+", "");

        ParkingLot lot = parkingLotRepository.findById(request.parkingLotId())
            .orElse(null);
        if (lot == null) {
            return ResponseEntity.ok(new CameraEntryResponse(false, "Nie znaleziono parkingu.", plate, null));
        }

        if (lot.getAccessType() != ParkingAccessType.BARRIER) {
            return ResponseEntity.ok(new CameraEntryResponse(false, "Ten parking nie ma szlabanu.", plate, null));
        }

        int freeSpots = lot.getTotalSpots() - lot.getOccupiedSpots();
        if (freeSpots <= 0) {
            return ResponseEntity.ok(new CameraEntryResponse(false, "Parking pełny. Szlaban pozostaje zamknięty.", plate, null));
        }

        boolean hasActive = sessionRepository.findFirstByRegistrationNumberIgnoreCaseAndStatusIn(
            plate, List.of(ParkingSessionStatus.ACTIVE)
        ).isPresent();
        if (hasActive) {
            return ResponseEntity.ok(new CameraEntryResponse(false, "Pojazd już jest na parkingu.", plate, null));
        }

        ParkingSession session = ParkingSession.builder()
            .parkingLot(lot)
            .registrationNumber(plate)
            .startedAt(LocalDateTime.now())
            .status(ParkingSessionStatus.ACTIVE)
            .currency("PLN")
            .build();
        ParkingSession saved = sessionRepository.save(session);

        return ResponseEntity.ok(new CameraEntryResponse(true, "Wjazd zarejestrowany. Szlaban otwiera się.", plate, saved.getId()));
    }

    @GetMapping("/{plate}")
    public PlateCheckResponse check(@PathVariable String plate) {
        String normalizedPlate = plate.toUpperCase().replaceAll("\\s+", "");

        List<PlateCheckResponse.ActiveSession> sessions = sessionRepository
            .findByRegistrationNumberIgnoreCaseAndStatusIn(
                normalizedPlate,
                List.of(ParkingSessionStatus.ACTIVE, ParkingSessionStatus.PAID, ParkingSessionStatus.PAYMENT_PENDING)
            )
            .stream()
            .map(s -> new PlateCheckResponse.ActiveSession(
                s.getId(),
                s.getParkingLot().getName(),
                s.getStartedAt(),
                s.getEndedAt(),
                s.getStatus().name()
            ))
            .toList();

        List<PlateCheckResponse.ActiveReservation> reservations = reservationRepository
            .findCurrentlyActiveByVehiclePlate(normalizedPlate, ReservationStatus.CONFIRMED, LocalDateTime.now())
            .stream()
            .map(r -> new PlateCheckResponse.ActiveReservation(
                r.getId(),
                r.getParkingLot().getName(),
                r.getStartsAt(),
                r.getEndsAt(),
                r.getStatus().name()
            ))
            .toList();

        boolean hasPaidSession = sessions.stream()
            .anyMatch(s -> "PAID".equals(s.status()) || "ACTIVE".equals(s.status()));
        boolean hasActiveReservation = !reservations.isEmpty();

        return new PlateCheckResponse(
            normalizedPlate,
            hasPaidSession,
            hasActiveReservation,
            sessions,
            reservations
        );
    }

    @PostMapping("/exit/{plate}/initiate")
    public ResponseEntity<ExitPaymentResponse> initiateExitPayment(@PathVariable String plate) {
        String normalizedPlate = plate.toUpperCase().replaceAll("\\s+", "");

        ParkingSession session = sessionRepository
            .findFirstByRegistrationNumberIgnoreCaseAndStatusIn(normalizedPlate, List.of(ParkingSessionStatus.ACTIVE))
            .orElse(null);

        if (session == null) {
            return ResponseEntity.ok(new ExitPaymentResponse(false, "Brak aktywnej sesji dla " + normalizedPlate, null, null, null));
        }

        LocalDateTime endedAt = LocalDateTime.now();
        long minutes = Duration.between(session.getStartedAt(), endedAt).toMinutes();
        BigDecimal amount = calculateFeeSafely(session.getParkingLot().getId(), (int) Math.max(minutes, 1));

        session.setEndedAt(endedAt);
        session.setAmount(amount);
        session.setStatus(ParkingSessionStatus.PAYMENT_PENDING);
        session.setPaymentToken(UUID.randomUUID().toString().replace("-", ""));
        sessionRepository.save(session);

        return ResponseEntity.ok(new ExitPaymentResponse(
            true, "Płatność przygotowana.",
            session.getPaymentToken(), amount, session.getCurrency()
        ));
    }

    @PostMapping("/exit/confirm/{token}")
    public ResponseEntity<ExitPaymentResponse> confirmExitPayment(@PathVariable String token) {
        ParkingSession session = sessionRepository.findByPaymentToken(token).orElse(null);
        if (session == null || session.getStatus() != ParkingSessionStatus.PAYMENT_PENDING) {
            return ResponseEntity.ok(new ExitPaymentResponse(false, "Nieprawidłowy token płatności.", null, null, null));
        }
        session.setStatus(ParkingSessionStatus.PAID);
        sessionRepository.save(session);
        return ResponseEntity.ok(new ExitPaymentResponse(true, "Płatność potwierdzona. Możesz wyjechać.", null, session.getAmount(), session.getCurrency()));
    }

    private BigDecimal calculateFeeSafely(Long parkingLotId, int minutes) {
        try {
            var fee = parkingFeeService.calculateFee(parkingLotId, minutes);
            return fee != null ? fee.amount() : BigDecimal.ZERO;
        } catch (RuntimeException ignored) {
            return BigDecimal.ZERO;
        }
    }
}

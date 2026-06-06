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
import pl.krakow.parking.repository.VehicleRepository;
import pl.krakow.parking.service.NotificationService;
import pl.krakow.parking.service.ParkingFeeService;

@RestController
@RequestMapping("/api/inspect")
public class PlateCheckController {

    private final ParkingSessionRepository sessionRepository;
    private final ReservationRepository reservationRepository;
    private final ParkingLotRepository parkingLotRepository;
    private final ParkingFeeService parkingFeeService;
    private final VehicleRepository vehicleRepository;
    private final NotificationService notificationService;

    public PlateCheckController(
        ParkingSessionRepository sessionRepository,
        ReservationRepository reservationRepository,
        ParkingLotRepository parkingLotRepository,
        ParkingFeeService parkingFeeService,
        VehicleRepository vehicleRepository,
        NotificationService notificationService
    ) {
        this.sessionRepository = sessionRepository;
        this.reservationRepository = reservationRepository;
        this.parkingLotRepository = parkingLotRepository;
        this.parkingFeeService = parkingFeeService;
        this.vehicleRepository = vehicleRepository;
        this.notificationService = notificationService;
    }

    @PostMapping("/entry")
    public ResponseEntity<CameraEntryResponse> recordEntry(@RequestBody @Valid CameraEntryRequest request) {
        String plate = request.registrationNumber().toUpperCase().replaceAll("\\s+", "");

        ParkingLot lot = parkingLotRepository.findById(request.parkingLotId()).orElse(null);
        if (lot == null) {
            return ResponseEntity.ok(new CameraEntryResponse(false, "Nie znaleziono parkingu.", plate, null));
        }

        if (lot.getAccessType() != ParkingAccessType.BARRIER) {
            return ResponseEntity.ok(new CameraEntryResponse(false, "Ten parking nie ma szlabanu.", plate, null));
        }

        int freeSpots = lot.getTotalSpots() - lot.getOccupiedSpots();
        if (freeSpots <= 0) {
            return ResponseEntity.ok(new CameraEntryResponse(false, "Parking pelny. Szlaban pozostaje zamkniety.", plate, null));
        }

        boolean hasActive = sessionRepository.findFirstByRegistrationNumberIgnoreCaseAndStatusIn(
            plate, List.of(ParkingSessionStatus.ACTIVE)
        ).isPresent();
        if (hasActive) {
            return ResponseEntity.ok(new CameraEntryResponse(false, "Pojazd juz jest na parkingu.", plate, null));
        }

        ParkingSession session = ParkingSession.builder()
            .parkingLot(lot)
            .registrationNumber(plate)
            .startedAt(LocalDateTime.now())
            .status(ParkingSessionStatus.ACTIVE)
            .currency("PLN")
            .build();
        ParkingSession saved = sessionRepository.save(session);

        vehicleRepository.findUserVehiclesByPlate(plate).stream().findFirst().ifPresent(vehicle -> {
            saved.setUser(vehicle.getUser());
            sessionRepository.save(saved);
            notificationService.createSessionStartedNotification(saved);
        });

        return ResponseEntity.ok(new CameraEntryResponse(true, "Wjazd zarejestrowany. Szlaban otwiera sie.", plate, saved.getId()));
    }

    @GetMapping("/{plate}")
    public PlateCheckResponse check(@PathVariable String plate) {
        String normalizedPlate = plate.toUpperCase().replaceAll("\\s+", "");
        LocalDateTime now = LocalDateTime.now();

        List<PlateCheckResponse.ActiveSession> sessions = sessionRepository
            .findByRegistrationNumberIgnoreCaseAndStatusIn(
                normalizedPlate,
                List.of(ParkingSessionStatus.ACTIVE, ParkingSessionStatus.PAID, ParkingSessionStatus.PAYMENT_PENDING)
            )
            .stream()
            .map(s -> {
                boolean expired = s.getStatus() == ParkingSessionStatus.PAID
                    && s.getEndedAt() != null
                    && s.getEndedAt().isBefore(now);
                return new PlateCheckResponse.ActiveSession(
                    s.getId(),
                    s.getParkingLot().getName(),
                    s.getStartedAt(),
                    s.getEndedAt(),
                    s.getStatus().name(),
                    expired
                );
            })
            .toList();

        List<PlateCheckResponse.ActiveReservation> reservations = reservationRepository
            .findCurrentlyActiveByVehiclePlate(normalizedPlate, ReservationStatus.CONFIRMED, now)
            .stream()
            .map(r -> new PlateCheckResponse.ActiveReservation(
                r.getId(),
                r.getParkingLot().getName(),
                r.getStartsAt(),
                r.getEndsAt(),
                r.getStatus().name()
            ))
            .toList();

        boolean hasPaidSession = sessions.stream().anyMatch(s -> {
            if ("ACTIVE".equals(s.status())) return true;
            if ("PAID".equals(s.status())) return !s.expired();
            return false;
        });
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
        LocalDateTime now = LocalDateTime.now();

        boolean coveredByReservation = !reservationRepository
            .findCurrentlyActiveByVehiclePlate(normalizedPlate, ReservationStatus.CONFIRMED, now)
            .isEmpty();

        if (coveredByReservation) {
            sessionRepository.findFirstByRegistrationNumberIgnoreCaseAndStatusIn(
                normalizedPlate, List.of(ParkingSessionStatus.ACTIVE)
            ).ifPresent(s -> {
                s.setEndedAt(now);
                s.setAmount(BigDecimal.ZERO);
                s.setStatus(ParkingSessionStatus.PAID);
                sessionRepository.save(s);
            });
            return ResponseEntity.ok(new ExitPaymentResponse(
                true, "Pojazd objety aktywna rezerwacja. Wyjazd bez dodatkowej oplaty.", null, BigDecimal.ZERO, "PLN"
            ));
        }

        ParkingSession session = sessionRepository
            .findFirstByRegistrationNumberIgnoreCaseAndStatusIn(normalizedPlate, List.of(ParkingSessionStatus.ACTIVE))
            .orElse(null);

        if (session == null) {
            return ResponseEntity.ok(new ExitPaymentResponse(false, "Brak aktywnej sesji dla " + normalizedPlate, null, null, null));
        }

        long minutes = Duration.between(session.getStartedAt(), now).toMinutes();
        BigDecimal amount = calculateFeeSafely(session.getParkingLot().getId(), (int) Math.max(minutes, 1));

        session.setEndedAt(now);
        session.setAmount(amount);
        session.setStatus(ParkingSessionStatus.PAYMENT_PENDING);
        session.setPaymentToken(UUID.randomUUID().toString().replace("-", ""));
        sessionRepository.save(session);

        return ResponseEntity.ok(new ExitPaymentResponse(
            true, "Platnosc przygotowana.",
            session.getPaymentToken(), amount, session.getCurrency()
        ));
    }

    @PostMapping("/exit/confirm/{token}")
    public ResponseEntity<ExitPaymentResponse> confirmExitPayment(@PathVariable String token) {
        ParkingSession session = sessionRepository.findByPaymentToken(token).orElse(null);
        if (session == null || session.getStatus() != ParkingSessionStatus.PAYMENT_PENDING) {
            return ResponseEntity.ok(new ExitPaymentResponse(false, "Nieprawidlowy token platnosci.", null, null, null));
        }
        session.setStatus(ParkingSessionStatus.PAID);
        ParkingSession saved = sessionRepository.save(session);
        notificationService.createSessionPaidNotification(saved);
        return ResponseEntity.ok(new ExitPaymentResponse(true, "Platnosc potwierdzona. Mozesz wyjechac.", null, saved.getAmount(), saved.getCurrency()));
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

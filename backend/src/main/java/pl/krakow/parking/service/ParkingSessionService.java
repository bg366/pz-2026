package pl.krakow.parking.service;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.krakow.parking.dto.ParkingSessionResponse;
import pl.krakow.parking.dto.StartSessionRequest;
import pl.krakow.parking.exception.ResourceNotFoundException;
import pl.krakow.parking.model.ParkingAccessType;
import pl.krakow.parking.model.ParkingLot;
import pl.krakow.parking.model.ParkingLotStatus;
import pl.krakow.parking.model.ParkingSession;
import pl.krakow.parking.model.ParkingSessionStatus;
import pl.krakow.parking.model.User;
import pl.krakow.parking.config.PaynowProperties;
import pl.krakow.parking.repository.ParkingLotRepository;
import pl.krakow.parking.repository.ParkingSessionRepository;
import pl.krakow.parking.repository.UserRepository;
import pl.krakow.parking.service.PaynowClient.PaymentInitResult;

@Service
public class ParkingSessionService {

    private final ParkingSessionRepository sessionRepository;
    private final ParkingLotRepository parkingLotRepository;
    private final UserRepository userRepository;
    private final ParkingFeeService parkingFeeService;
    private final PaynowClient paynowClient;
    private final PaynowProperties paynowProps;
    private final NotificationService notificationService;

    public ParkingSessionService(
        ParkingSessionRepository sessionRepository,
        ParkingLotRepository parkingLotRepository,
        UserRepository userRepository,
        ParkingFeeService parkingFeeService,
        PaynowClient paynowClient,
        PaynowProperties paynowProps,
        NotificationService notificationService
    ) {
        this.sessionRepository = sessionRepository;
        this.parkingLotRepository = parkingLotRepository;
        this.userRepository = userRepository;
        this.parkingFeeService = parkingFeeService;
        this.paynowClient = paynowClient;
        this.paynowProps = paynowProps;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public List<ParkingSessionResponse> listForUser(String email) {
        return sessionRepository.findByUserEmailIgnoreCaseOrderByStartedAtDesc(email)
            .stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public ParkingSessionResponse startSession(String email, StartSessionRequest request) {
        ParkingLot lot = parkingLotRepository.findById(request.parkingLotId())
            .orElseThrow(() -> new ResourceNotFoundException("Parking not found: " + request.parkingLotId()));

        if (lot.getStatus() != ParkingLotStatus.ACTIVE) {
            throw new IllegalArgumentException("Parking jest niedostepny.");
        }

        User user = userRepository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));

        String plate = request.registrationNumber().toUpperCase().replaceAll("\\s+", "");

        boolean hasActive = sessionRepository.findFirstByRegistrationNumberIgnoreCaseAndStatusIn(
            plate, List.of(ParkingSessionStatus.ACTIVE, ParkingSessionStatus.PAYMENT_PENDING)
        ).isPresent();
        if (hasActive) {
            throw new IllegalArgumentException("Istnieje juz aktywna sesja parkingowa dla rejestracji " + plate + ".");
        }

        LocalDateTime now = LocalDateTime.now();

        if (lot.getAccessType() == ParkingAccessType.OPEN) {
            if (request.plannedEndAt() == null) {
                throw new IllegalArgumentException("Dla parkingow otwartych wymagane jest podanie godziny wyjazdu.");
            }
            if (!request.plannedEndAt().isAfter(now)) {
                throw new IllegalArgumentException("Godzina wyjazdu musi byc w przyszlosci.");
            }
            long minutes = Math.max(Duration.between(now, request.plannedEndAt()).toMinutes(), 1);
            BigDecimal amount = calculateFeeSafely(lot.getId(), (int) minutes);
            ParkingSession openSession = ParkingSession.builder()
                .parkingLot(lot)
                .user(user)
                .registrationNumber(plate)
                .startedAt(now)
                .endedAt(request.plannedEndAt())
                .status(ParkingSessionStatus.PAYMENT_PENDING)
                .amount(amount)
                .currency("PLN")
                .paymentToken(UUID.randomUUID().toString().replace("-", ""))
                .build();
            return toResponse(sessionRepository.save(openSession));
        }

        int freeSpots = lot.getTotalSpots() - lot.getOccupiedSpots();
        if (freeSpots <= 0) {
            throw new IllegalArgumentException("Parking jest pelny. Szlaban pozostaje zamkniety.");
        }

        ParkingSession session = ParkingSession.builder()
            .parkingLot(lot)
            .user(user)
            .registrationNumber(plate)
            .startedAt(now)
            .status(ParkingSessionStatus.ACTIVE)
            .currency("PLN")
            .build();

        ParkingSession saved = sessionRepository.save(session);
        notificationService.createSessionStartedNotification(saved);
        return toResponse(saved);
    }

    @Transactional
    public ParkingSessionResponse requestPayment(Long sessionId, String email) {
        ParkingSession session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));

        if (!session.getUser().getEmail().equalsIgnoreCase(email)) {
            throw new AccessDeniedException("This session does not belong to you.");
        }

        if (session.getStatus() != ParkingSessionStatus.ACTIVE) {
            throw new IllegalArgumentException("Sesja nie jest aktywna.");
        }

        LocalDateTime endedAt = LocalDateTime.now();
        long minutes = Duration.between(session.getStartedAt(), endedAt).toMinutes();
        BigDecimal amount = calculateFeeSafely(session.getParkingLot().getId(), (int) Math.max(minutes, 1));

        session.setEndedAt(endedAt);
        session.setAmount(amount);
        session.setStatus(ParkingSessionStatus.PAYMENT_PENDING);
        session.setPaymentToken(UUID.randomUUID().toString().replace("-", ""));

        return toResponse(sessionRepository.save(session));
    }

    @Transactional
    public ParkingSessionResponse confirmPayment(String token, String email) {
        ParkingSession session = sessionRepository.findByPaymentToken(token)
            .orElseThrow(() -> new ResourceNotFoundException("Payment token not found."));

        if (!session.getUser().getEmail().equalsIgnoreCase(email)) {
            throw new AccessDeniedException("This session does not belong to you.");
        }

        if (session.getStatus() != ParkingSessionStatus.PAYMENT_PENDING) {
            throw new IllegalArgumentException("Sesja nie oczekuje na platnosc.");
        }

        session.setStatus(ParkingSessionStatus.PAID);
        ParkingSession saved = sessionRepository.save(session);
        notificationService.createSessionPaidNotification(saved);
        return toResponse(saved);
    }

    @Transactional
    public ParkingSessionResponse cancelSession(Long sessionId, String email) {
        ParkingSession session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));

        if (!session.getUser().getEmail().equalsIgnoreCase(email)) {
            throw new AccessDeniedException("This session does not belong to you.");
        }

        if (session.getStatus() != ParkingSessionStatus.ACTIVE
            && session.getStatus() != ParkingSessionStatus.PAYMENT_PENDING) {
            throw new IllegalArgumentException("Mozna anulowac tylko aktywna lub oczekujaca sesje.");
        }

        session.setStatus(ParkingSessionStatus.CANCELLED);
        return toResponse(sessionRepository.save(session));
    }

    @Transactional
    public String initiateSessionPayment(String token, String email) {
        ParkingSession session = sessionRepository.findByPaymentToken(token)
            .orElseThrow(() -> new ResourceNotFoundException("Payment token not found."));
        if (!session.getUser().getEmail().equalsIgnoreCase(email)) {
            throw new AccessDeniedException("This session does not belong to you.");
        }
        if (session.getStatus() != ParkingSessionStatus.PAYMENT_PENDING) {
            throw new IllegalArgumentException("Sesja nie oczekuje na platnosc.");
        }
        String description = "Parking " + session.getParkingLot().getName()
            + " — " + session.getRegistrationNumber();
        String baseUrl = paynowProps.getContinueUrl();
        String sessionContinueUrl = baseUrl.replace("/rezerwacje", "/sesje") + "?session_paynow=" + token;
        BigDecimal amount = session.getAmount() != null ? session.getAmount() : BigDecimal.ZERO;
        PaymentInitResult result = paynowClient.initiatePayment(token, amount, description, email, sessionContinueUrl);
        return result != null ? result.redirectUrl() : null;
    }

    private BigDecimal calculateFeeSafely(Long parkingLotId, int minutes) {
        try {
            var fee = parkingFeeService.calculateFee(parkingLotId, minutes);
            return fee != null ? fee.amount() : BigDecimal.ZERO;
        } catch (RuntimeException ignored) {
            return BigDecimal.ZERO;
        }
    }

    private ParkingSessionResponse toResponse(ParkingSession s) {
        return new ParkingSessionResponse(
            s.getId(),
            s.getParkingLot().getId(),
            s.getParkingLot().getName(),
            s.getParkingLot().getAddress(),
            s.getRegistrationNumber(),
            s.getStartedAt(),
            s.getEndedAt(),
            s.getStatus(),
            s.getAmount(),
            s.getCurrency(),
            s.getPaymentToken()
        );
    }
}

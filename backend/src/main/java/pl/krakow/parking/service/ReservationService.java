package pl.krakow.parking.service;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.krakow.parking.dto.ReservationRequest;
import pl.krakow.parking.dto.ReservationResponse;
import pl.krakow.parking.exception.ResourceNotFoundException;
import pl.krakow.parking.model.Payment;
import pl.krakow.parking.model.PaymentStatus;
import pl.krakow.parking.model.ParkingAccessType;
import pl.krakow.parking.model.ParkingLot;
import pl.krakow.parking.model.ParkingLotStatus;
import pl.krakow.parking.model.Reservation;
import pl.krakow.parking.model.ReservationStatus;
import pl.krakow.parking.model.User;
import pl.krakow.parking.repository.ParkingLotRepository;
import pl.krakow.parking.repository.PaymentRepository;
import pl.krakow.parking.repository.ReservationRepository;
import pl.krakow.parking.repository.UserRepository;

@Service
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final ParkingLotRepository parkingLotRepository;
    private final UserRepository userRepository;
    private final ParkingFeeService parkingFeeService;
    private final PaymentRepository paymentRepository;

    public ReservationService(
        ReservationRepository reservationRepository,
        ParkingLotRepository parkingLotRepository,
        UserRepository userRepository,
        ParkingFeeService parkingFeeService,
        PaymentRepository paymentRepository
    ) {
        this.reservationRepository = reservationRepository;
        this.parkingLotRepository = parkingLotRepository;
        this.userRepository = userRepository;
        this.parkingFeeService = parkingFeeService;
        this.paymentRepository = paymentRepository;
    }

    public List<ReservationResponse> listForUser(String email) {
        return reservationRepository.findByUserEmailIgnoreCaseOrderByStartsAtDesc(email)
            .stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public ReservationResponse create(String email, ReservationRequest request) {
        if (!request.endsAt().isAfter(request.startsAt())) {
            throw new IllegalArgumentException("Czas zakończenia musi być po czasie rozpoczęcia.");
        }

        User user = userRepository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));

        ParkingLot parkingLot = parkingLotRepository.findById(request.parkingLotId())
            .orElseThrow(() -> new ResourceNotFoundException("Parking lot not found: " + request.parkingLotId()));

        if (parkingLot.getStatus() != ParkingLotStatus.ACTIVE) {
            throw new IllegalArgumentException("Parking jest niedostępny (status: " + parkingLot.getStatus() + ").");
        }

        if (parkingLot.getAccessType() == ParkingAccessType.OPEN) {
            throw new IllegalArgumentException("Ten parking jest otwarty bez szlabanu. Nie wymaga rezerwacji — opłacisz pobyt po przyjeździe.");
        }

        int freeSpots = parkingLot.getTotalSpots() - parkingLot.getOccupiedSpots();
        if (freeSpots <= 0) {
            throw new IllegalArgumentException("Parking jest pełny. Brak wolnych miejsc.");
        }

        Reservation reservation = Reservation.builder()
            .user(user)
            .parkingLot(parkingLot)
            .status(ReservationStatus.PENDING_PAYMENT)
            .registrationNumber(request.registrationNumber().toUpperCase())
            .startsAt(request.startsAt())
            .endsAt(request.endsAt())
            .build();

        Reservation saved = reservationRepository.save(reservation);

        var fee = calculateFeeSafely(saved);
        BigDecimal amount = fee != null ? fee.amount() : BigDecimal.ZERO;
        String currency = fee != null ? fee.currency() : "PLN";

        Payment payment = Payment.builder()
            .reservation(saved)
            .amount(amount)
            .currency(currency)
            .status(PaymentStatus.PENDING)
            .token(UUID.randomUUID().toString().replace("-", ""))
            .build();

        paymentRepository.save(payment);

        return toResponse(saved, payment.getToken(), fee);
    }

    @Transactional
    public ReservationResponse cancel(Long id, String email) {
        Reservation reservation = reservationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Reservation not found: " + id));

        if (!reservation.getUser().getEmail().equalsIgnoreCase(email)) {
            throw new AccessDeniedException("This reservation does not belong to you.");
        }

        if (reservation.getStatus() != ReservationStatus.CONFIRMED
                && reservation.getStatus() != ReservationStatus.PENDING_PAYMENT) {
            throw new IllegalArgumentException("Tylko aktywna rezerwacja może zostać anulowana.");
        }

        if (reservation.getStatus() == ReservationStatus.PENDING_PAYMENT) {
            paymentRepository.findByReservationId(reservation.getId()).ifPresent(p -> {
                p.setStatus(PaymentStatus.CANCELLED);
                paymentRepository.save(p);
            });
        }

        reservation.setStatus(ReservationStatus.CANCELLED);
        return toResponse(reservationRepository.save(reservation));
    }

    private ReservationResponse toResponse(Reservation r) {
        var fee = calculateFeeSafely(r);
        String paymentToken = null;
        if (r.getStatus() == ReservationStatus.PENDING_PAYMENT) {
            paymentToken = paymentRepository.findByReservationId(r.getId())
                .map(Payment::getToken)
                .orElse(null);
        }
        return toResponse(r, paymentToken, fee);
    }

    private ReservationResponse toResponse(Reservation r, String paymentToken, pl.krakow.parking.dto.ParkingFeeResponse fee) {
        return new ReservationResponse(
            r.getId(),
            r.getParkingLot().getId(),
            r.getParkingLot().getName(),
            r.getParkingLot().getAddress(),
            r.getStatus(),
            r.getRegistrationNumber(),
            r.getStartsAt(),
            r.getEndsAt(),
            r.getCreatedAt(),
            fee != null ? fee.amount() : null,
            fee != null ? fee.currency() : null,
            fee != null ? fee.selectedPricingMode() : null,
            paymentToken
        );
    }

    private pl.krakow.parking.dto.ParkingFeeResponse calculateFeeSafely(Reservation reservation) {
        long minutes = Duration.between(reservation.getStartsAt(), reservation.getEndsAt()).toMinutes();
        if (minutes <= 0) {
            return null;
        }
        try {
            return parkingFeeService.calculateFee(reservation.getParkingLot().getId(), Math.toIntExact(minutes));
        } catch (RuntimeException ignored) {
            return null;
        }
    }
}

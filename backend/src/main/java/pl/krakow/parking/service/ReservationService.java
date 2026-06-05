package pl.krakow.parking.service;

import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.krakow.parking.dto.ReservationRequest;
import pl.krakow.parking.dto.ReservationResponse;
import pl.krakow.parking.exception.ResourceNotFoundException;
import pl.krakow.parking.model.ParkingLot;
import pl.krakow.parking.model.ParkingLotStatus;
import pl.krakow.parking.model.Reservation;
import pl.krakow.parking.model.ReservationStatus;
import pl.krakow.parking.model.User;
import pl.krakow.parking.repository.ParkingLotRepository;
import pl.krakow.parking.repository.ReservationRepository;
import pl.krakow.parking.repository.UserRepository;

@Service
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final ParkingLotRepository parkingLotRepository;
    private final UserRepository userRepository;

    public ReservationService(
        ReservationRepository reservationRepository,
        ParkingLotRepository parkingLotRepository,
        UserRepository userRepository
    ) {
        this.reservationRepository = reservationRepository;
        this.parkingLotRepository = parkingLotRepository;
        this.userRepository = userRepository;
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

        Reservation reservation = Reservation.builder()
            .user(user)
            .parkingLot(parkingLot)
            .status(ReservationStatus.CONFIRMED)
            .startsAt(request.startsAt())
            .endsAt(request.endsAt())
            .build();

        return toResponse(reservationRepository.save(reservation));
    }

    @Transactional
    public ReservationResponse cancel(Long id, String email) {
        Reservation reservation = reservationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Reservation not found: " + id));

        if (!reservation.getUser().getEmail().equalsIgnoreCase(email)) {
            throw new AccessDeniedException("This reservation does not belong to you.");
        }

        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            throw new IllegalArgumentException("Tylko aktywna rezerwacja może zostać anulowana.");
        }

        reservation.setStatus(ReservationStatus.CANCELLED);
        return toResponse(reservationRepository.save(reservation));
    }

    private ReservationResponse toResponse(Reservation r) {
        return new ReservationResponse(
            r.getId(),
            r.getParkingLot().getId(),
            r.getParkingLot().getName(),
            r.getParkingLot().getAddress(),
            r.getStatus(),
            r.getStartsAt(),
            r.getEndsAt(),
            r.getCreatedAt()
        );
    }
}

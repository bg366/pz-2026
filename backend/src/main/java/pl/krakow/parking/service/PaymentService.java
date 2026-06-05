package pl.krakow.parking.service;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.krakow.parking.dto.PaymentResponse;
import pl.krakow.parking.exception.ResourceNotFoundException;
import pl.krakow.parking.model.Payment;
import pl.krakow.parking.model.PaymentStatus;
import pl.krakow.parking.model.ReservationStatus;
import pl.krakow.parking.config.PaynowProperties;
import pl.krakow.parking.repository.PaymentRepository;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final NotificationService notificationService;
    private final PaynowClient paynowClient;
    private final PaynowProperties props;

    public PaymentService(
        PaymentRepository paymentRepository,
        NotificationService notificationService,
        PaynowClient paynowClient,
        PaynowProperties props
    ) {
        this.paymentRepository = paymentRepository;
        this.notificationService = notificationService;
        this.paynowClient = paynowClient;
        this.props = props;
    }

    @Transactional
    public PaymentResponse initiate(String token, String email) {
        Payment payment = findAndValidate(token, email);
        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new IllegalArgumentException("Płatność nie jest już aktywna.");
        }
        String description = "Rezerwacja #" + payment.getReservation().getId()
            + " — " + payment.getReservation().getParkingLot().getName();
        String continueUrl = props.getContinueUrl() + "?paynow=" + token;
        var result = paynowClient.initiatePayment(token, payment.getAmount(), description, email, continueUrl);
        String redirectUrl = result != null ? result.redirectUrl() : null;
        return toResponse(payment, redirectUrl);
    }

    @Transactional
    public PaymentResponse confirm(String token, String email) {
        Payment payment = findAndValidate(token, email);
        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new IllegalArgumentException("Płatność nie jest już aktywna.");
        }
        payment.setStatus(PaymentStatus.COMPLETED);
        payment.getReservation().setStatus(ReservationStatus.CONFIRMED);
        Payment saved = paymentRepository.save(payment);
        notificationService.createConfirmedNotification(saved.getReservation());
        return toResponse(saved);
    }

    @Transactional
    public PaymentResponse cancel(String token, String email) {
        Payment payment = findAndValidate(token, email);
        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new IllegalArgumentException("Płatność nie jest już aktywna.");
        }
        payment.setStatus(PaymentStatus.CANCELLED);
        payment.getReservation().setStatus(ReservationStatus.CANCELLED);
        return toResponse(paymentRepository.save(payment));
    }

    private Payment findAndValidate(String token, String email) {
        Payment payment = paymentRepository.findByToken(token)
            .orElseThrow(() -> new ResourceNotFoundException("Payment not found: " + token));
        if (!payment.getReservation().getUser().getEmail().equalsIgnoreCase(email)) {
            throw new AccessDeniedException("This payment does not belong to you.");
        }
        return payment;
    }

    private PaymentResponse toResponse(Payment p) {
        return toResponse(p, null);
    }

    private PaymentResponse toResponse(Payment p, String redirectUrl) {
        return new PaymentResponse(
            p.getId(),
            p.getReservation().getId(),
            p.getAmount(),
            p.getCurrency(),
            p.getStatus(),
            p.getToken(),
            redirectUrl
        );
    }
}

package pl.krakow.parking.controller;

import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.krakow.parking.dto.ReservationRequest;
import pl.krakow.parking.dto.ReservationResponse;
import pl.krakow.parking.service.ReservationService;

@RestController
@RequestMapping("/api/me/reservations")
public class ReservationController {

    private final ReservationService reservationService;

    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    @GetMapping
    public List<ReservationResponse> list(Principal principal) {
        return reservationService.listForUser(principal.getName());
    }

    @PostMapping
    public ReservationResponse create(Principal principal, @Valid @RequestBody ReservationRequest request) {
        return reservationService.create(principal.getName(), request);
    }

    @DeleteMapping("/{id}")
    public ReservationResponse cancel(Principal principal, @PathVariable Long id) {
        return reservationService.cancel(id, principal.getName());
    }
}

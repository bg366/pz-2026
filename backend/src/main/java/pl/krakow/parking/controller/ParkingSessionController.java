package pl.krakow.parking.controller;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.krakow.parking.dto.ParkingSessionResponse;
import pl.krakow.parking.dto.StartSessionRequest;
import pl.krakow.parking.service.ParkingSessionService;

@RestController
@RequestMapping("/api/me/parking-sessions")
public class ParkingSessionController {

    private final ParkingSessionService sessionService;

    public ParkingSessionController(ParkingSessionService sessionService) {
        this.sessionService = sessionService;
    }

    @GetMapping
    public List<ParkingSessionResponse> list(@AuthenticationPrincipal UserDetails userDetails) {
        return sessionService.listForUser(userDetails.getUsername());
    }

    @PostMapping
    public ResponseEntity<ParkingSessionResponse> start(
        @AuthenticationPrincipal UserDetails userDetails,
        @RequestBody @Valid StartSessionRequest request
    ) {
        return ResponseEntity.ok(sessionService.startSession(userDetails.getUsername(), request));
    }

    @PostMapping("/initiate/{token}")
    public ResponseEntity<Map<String, String>> initiatePayment(
        @AuthenticationPrincipal UserDetails userDetails,
        @PathVariable String token
    ) {
        String redirectUrl = sessionService.initiateSessionPayment(token, userDetails.getUsername());
        if (redirectUrl != null) {
            return ResponseEntity.ok(Map.of("redirectUrl", redirectUrl));
        }
        return ResponseEntity.ok(Map.of());
    }

    @PostMapping("/{id}/pay")
    public ParkingSessionResponse requestPayment(
        @AuthenticationPrincipal UserDetails userDetails,
        @PathVariable Long id
    ) {
        return sessionService.requestPayment(id, userDetails.getUsername());
    }

    @PostMapping("/confirm/{token}")
    public ParkingSessionResponse confirmPayment(
        @AuthenticationPrincipal UserDetails userDetails,
        @PathVariable String token
    ) {
        return sessionService.confirmPayment(token, userDetails.getUsername());
    }

    @DeleteMapping("/{id}")
    public ParkingSessionResponse cancel(
        @AuthenticationPrincipal UserDetails userDetails,
        @PathVariable Long id
    ) {
        return sessionService.cancelSession(id, userDetails.getUsername());
    }
}

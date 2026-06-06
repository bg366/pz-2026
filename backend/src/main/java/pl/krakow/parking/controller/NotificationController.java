package pl.krakow.parking.controller;

import java.security.Principal;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.krakow.parking.dto.NotificationResponse;
import pl.krakow.parking.service.NotificationService;

@RestController
@RequestMapping("/api/me/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<NotificationResponse> list(Principal principal) {
        return notificationService.listForUser(principal.getName());
    }

    @PatchMapping("/{id}/read")
    public NotificationResponse markRead(@PathVariable Long id, Principal principal) {
        return notificationService.markRead(id, principal.getName());
    }
}

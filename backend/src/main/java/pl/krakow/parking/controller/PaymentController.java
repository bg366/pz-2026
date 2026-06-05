package pl.krakow.parking.controller;

import java.security.Principal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.krakow.parking.dto.PaymentResponse;
import pl.krakow.parking.service.PaymentService;

@RestController
@RequestMapping("/api/me/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/{token}/confirm")
    public PaymentResponse confirm(@PathVariable String token, Principal principal) {
        return paymentService.confirm(token, principal.getName());
    }

    @PostMapping("/{token}/cancel")
    public PaymentResponse cancel(@PathVariable String token, Principal principal) {
        return paymentService.cancel(token, principal.getName());
    }
}

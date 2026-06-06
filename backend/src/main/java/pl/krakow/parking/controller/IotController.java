package pl.krakow.parking.controller;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.krakow.parking.dto.IotDeviceResponse;
import pl.krakow.parking.dto.IotReadingRequest;
import pl.krakow.parking.dto.IotRegisterRequest;
import pl.krakow.parking.service.IotService;

@RestController
@RequestMapping("/api/integrations/iot")
public class IotController {

    private final IotService iotService;

    public IotController(IotService iotService) {
        this.iotService = iotService;
    }

    @PostMapping("/occupancy")
    public IotDeviceResponse receiveReading(@Valid @RequestBody IotReadingRequest request) {
        return iotService.processReading(request);
    }
}

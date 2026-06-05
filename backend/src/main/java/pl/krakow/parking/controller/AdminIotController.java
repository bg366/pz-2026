package pl.krakow.parking.controller;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.krakow.parking.dto.IotDeviceResponse;
import pl.krakow.parking.dto.IotRegisterRequest;
import pl.krakow.parking.service.IotService;

@RestController
@RequestMapping("/api/admin/iot-devices")
public class AdminIotController {

    private final IotService iotService;

    public AdminIotController(IotService iotService) {
        this.iotService = iotService;
    }

    @GetMapping
    public List<IotDeviceResponse> list() {
        return iotService.listDevices();
    }

    @PostMapping
    public IotDeviceResponse register(@Valid @RequestBody IotRegisterRequest request) {
        return iotService.registerDevice(request);
    }
}

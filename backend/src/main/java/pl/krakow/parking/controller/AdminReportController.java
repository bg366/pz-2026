package pl.krakow.parking.controller;

import java.time.LocalDate;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pl.krakow.parking.dto.OccupancyReportResponse;
import pl.krakow.parking.service.OccupancyReportService;

@RestController
@RequestMapping("/api/admin/reports/occupancy")
public class AdminReportController {

    private final OccupancyReportService occupancyReportService;

    public AdminReportController(OccupancyReportService occupancyReportService) {
        this.occupancyReportService = occupancyReportService;
    }

    @GetMapping("/current")
    public List<OccupancyReportResponse> current() {
        return occupancyReportService.current();
    }

    @GetMapping("/daily")
    public List<OccupancyReportResponse> daily(
        @RequestParam LocalDate date,
        @RequestParam(required = false) Long parkingLotId
    ) {
        return occupancyReportService.daily(date, parkingLotId);
    }

    @GetMapping("/monthly")
    public List<OccupancyReportResponse> monthly(
        @RequestParam int year,
        @RequestParam int month,
        @RequestParam(required = false) Long parkingLotId
    ) {
        return occupancyReportService.monthly(year, month, parkingLotId);
    }
}

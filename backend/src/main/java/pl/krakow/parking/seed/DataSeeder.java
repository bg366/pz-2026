package pl.krakow.parking.seed;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Random;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pl.krakow.parking.model.EmissionStandard;
import pl.krakow.parking.model.FuelType;
import pl.krakow.parking.model.ParkingLot;
import pl.krakow.parking.model.ParkingSpot;
import pl.krakow.parking.model.ParkingZone;
import pl.krakow.parking.model.SctRule;
import pl.krakow.parking.model.SpotCategory;
import pl.krakow.parking.model.Tariff;
import pl.krakow.parking.model.Vehicle;
import pl.krakow.parking.repository.ParkingLotRepository;
import pl.krakow.parking.repository.SctRuleRepository;
import pl.krakow.parking.repository.VehicleRepository;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final GeometryFactory GEOMETRY_FACTORY = new GeometryFactory(new PrecisionModel(), 4326);

    private final ParkingLotRepository parkingLotRepository;
    private final SctRuleRepository sctRuleRepository;
    private final VehicleRepository vehicleRepository;
    private final Random random = new Random(2026);

    public DataSeeder(
        ParkingLotRepository parkingLotRepository,
        SctRuleRepository sctRuleRepository,
        VehicleRepository vehicleRepository
    ) {
        this.parkingLotRepository = parkingLotRepository;
        this.sctRuleRepository = sctRuleRepository;
        this.vehicleRepository = vehicleRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (parkingLotRepository.count() > 0) {
            return;
        }

        seedParkingLots();
        seedSctRules();
        seedVehicles();
    }

    private void seedParkingLots() {
        createParking("Parking Galeria Krakowska", "ul. Pawia 5, Kraków", ParkingZone.ZONE_A, 50.0670, 19.9450, 500, "PUBLIC");
        createParking("Parking Bonarka City Center", "ul. Kamieńskiego 11, Kraków", ParkingZone.ZONE_B, 50.0305, 19.9570, 1100, "PUBLIC");
        createParking("Parking Galeria Kazimierz", "ul. Podgórska 34, Kraków", ParkingZone.ZONE_A, 50.0475, 19.9560, 650, "PUBLIC");
        createParking("Parking P+R Czerwone Maki", "ul. Czerwone Maki, Kraków", ParkingZone.ZONE_C, 50.0260, 19.8890, 250, "PARK_AND_RIDE");
        createParking("Parking P+R Bieżanów", "ul. Bieżanowska, Kraków", ParkingZone.ZONE_C, 50.0140, 20.0230, 200, "PARK_AND_RIDE");
        createParking("Parking Rynek Główny", "Rynek Główny, Kraków", ParkingZone.ZONE_A, 50.0615, 19.9370, 120, "UNDERGROUND");
        createParking("Parking Wawel", "ul. Powiśle, Kraków", ParkingZone.ZONE_A, 50.0540, 19.9355, 80, "PUBLIC");
        createParking("Parking ICE Kraków", "ul. Marii Konopnickiej 17, Kraków", ParkingZone.ZONE_B, 50.0500, 19.9250, 300, "PUBLIC");
    }

    private void createParking(
        String name,
        String address,
        ParkingZone zone,
        double latitude,
        double longitude,
        int totalSpots,
        String parkingType
    ) {
        int occupiedSpots = calculateOccupied(totalSpots);
        ParkingLot parkingLot = ParkingLot.builder()
            .name(name)
            .address(address)
            .zone(zone)
            .location(createPoint(longitude, latitude))
            .totalSpots(totalSpots)
            .occupiedSpots(occupiedSpots)
            .parkingType(parkingType)
            .build();

        addSpotBreakdown(parkingLot, totalSpots, occupiedSpots);
        parkingLot.addTariff(Tariff.builder()
            .zone(zone)
            .dayOfWeek(null)
            .hourFrom(LocalTime.of(0, 0))
            .hourTo(LocalTime.of(23, 59))
            .pricePerHour(defaultRate(zone))
            .currency("PLN")
            .build());

        parkingLotRepository.save(parkingLot);
    }

    private void addSpotBreakdown(ParkingLot parkingLot, int totalSpots, int occupiedSpots) {
        int regular = (int) Math.round(totalSpots * 0.7);
        int ev = (int) Math.round(totalSpots * 0.1);
        int disabled = (int) Math.round(totalSpots * 0.1);
        int sctReady = totalSpots - regular - ev - disabled;

        parkingLot.addSpot(spot(SpotCategory.REGULAR, regular, allocateOccupied(regular, occupiedSpots, totalSpots)));
        parkingLot.addSpot(spot(SpotCategory.EV, ev, allocateOccupied(ev, occupiedSpots, totalSpots)));
        parkingLot.addSpot(spot(SpotCategory.DISABLED, disabled, allocateOccupied(disabled, occupiedSpots, totalSpots)));
        parkingLot.addSpot(spot(SpotCategory.SCT_READY, sctReady, allocateOccupied(sctReady, occupiedSpots, totalSpots)));
    }

    private ParkingSpot spot(SpotCategory category, int total, int occupied) {
        return ParkingSpot.builder()
            .category(category)
            .total(total)
            .occupied(Math.min(total, occupied))
            .build();
    }

    private int allocateOccupied(int categoryTotal, int totalOccupied, int overallTotal) {
        if (overallTotal == 0) {
            return 0;
        }
        return (int) Math.round((double) categoryTotal / overallTotal * totalOccupied);
    }

    private int calculateOccupied(int totalSpots) {
        double factor = 0.4d + (0.4d * random.nextDouble());
        return (int) Math.round(totalSpots * factor);
    }

    private void seedSctRules() {
        String description = "Przykładowe reguły SCT dla MVP inspirowane uchwałą Rady Miasta Krakowa.";
        sctRuleRepository.saveAll(List.of(
            rule(ParkingZone.ZONE_A, FuelType.DIESEL, EmissionStandard.EURO_5, true, LocalDate.of(2024, 7, 1), description),
            rule(ParkingZone.ZONE_A, FuelType.PETROL, EmissionStandard.EURO_3, true, LocalDate.of(2024, 7, 1), description),
            rule(ParkingZone.ZONE_A, FuelType.LPG, EmissionStandard.EURO_3, true, LocalDate.of(2024, 7, 1), description),
            rule(ParkingZone.ZONE_A, FuelType.HYBRID, EmissionStandard.EURO_3, true, LocalDate.of(2024, 7, 1), description),
            rule(ParkingZone.ZONE_A, FuelType.ELECTRIC, EmissionStandard.ELECTRIC, true, LocalDate.of(2024, 7, 1), description),
            rule(ParkingZone.ZONE_B, FuelType.DIESEL, EmissionStandard.EURO_4, true, LocalDate.of(2025, 1, 1), description),
            rule(ParkingZone.ZONE_B, FuelType.PETROL, EmissionStandard.EURO_2, true, LocalDate.of(2025, 1, 1), description),
            rule(ParkingZone.ZONE_B, FuelType.LPG, EmissionStandard.EURO_2, true, LocalDate.of(2025, 1, 1), description),
            rule(ParkingZone.ZONE_B, FuelType.HYBRID, EmissionStandard.EURO_2, true, LocalDate.of(2025, 1, 1), description),
            rule(ParkingZone.ZONE_B, FuelType.ELECTRIC, EmissionStandard.ELECTRIC, true, LocalDate.of(2025, 1, 1), description),
            rule(ParkingZone.ZONE_C, FuelType.DIESEL, EmissionStandard.EURO_1, true, LocalDate.of(2024, 7, 1), description),
            rule(ParkingZone.ZONE_C, FuelType.PETROL, EmissionStandard.EURO_1, true, LocalDate.of(2024, 7, 1), description),
            rule(ParkingZone.ZONE_C, FuelType.LPG, EmissionStandard.EURO_1, true, LocalDate.of(2024, 7, 1), description),
            rule(ParkingZone.ZONE_C, FuelType.HYBRID, EmissionStandard.EURO_1, true, LocalDate.of(2024, 7, 1), description),
            rule(ParkingZone.ZONE_C, FuelType.ELECTRIC, EmissionStandard.ELECTRIC, true, LocalDate.of(2024, 7, 1), description)
        ));
    }

    private SctRule rule(
        ParkingZone zone,
        FuelType fuelType,
        EmissionStandard minimum,
        boolean allowed,
        LocalDate validFrom,
        String description
    ) {
        return SctRule.builder()
            .zone(zone)
            .fuelType(fuelType)
            .minEmissionStandard(minimum)
            .allowed(allowed)
            .validFrom(validFrom)
            .description(description)
            .build();
    }

    private void seedVehicles() {
        vehicleRepository.saveAll(List.of(
            Vehicle.builder().registrationNumber("KR1234A").fuelType(FuelType.DIESEL).emissionStandard(EmissionStandard.EURO_3).vehicleType("CAR").build(),
            Vehicle.builder().registrationNumber("KR5678B").fuelType(FuelType.PETROL).emissionStandard(EmissionStandard.EURO_5).vehicleType("CAR").build(),
            Vehicle.builder().registrationNumber("KR9EV22").fuelType(FuelType.ELECTRIC).emissionStandard(EmissionStandard.ELECTRIC).vehicleType("CAR").build()
        ));
    }

    private BigDecimal defaultRate(ParkingZone zone) {
        return switch (zone) {
            case ZONE_A -> BigDecimal.valueOf(6);
            case ZONE_B -> BigDecimal.valueOf(4);
            case ZONE_C -> BigDecimal.valueOf(2);
        };
    }

    private org.locationtech.jts.geom.Point createPoint(double longitude, double latitude) {
        org.locationtech.jts.geom.Point point = GEOMETRY_FACTORY.createPoint(new Coordinate(longitude, latitude));
        point.setSRID(4326);
        return point;
    }
}

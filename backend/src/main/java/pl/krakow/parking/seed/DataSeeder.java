package pl.krakow.parking.seed;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pl.krakow.parking.model.EmissionStandard;
import pl.krakow.parking.model.FuelType;
import pl.krakow.parking.model.ParkingAccessType;
import pl.krakow.parking.model.ParkingLot;
import pl.krakow.parking.model.ParkingLotStatus;
import pl.krakow.parking.model.ParkingSpot;
import pl.krakow.parking.model.ParkingZone;
import pl.krakow.parking.model.Price;
import pl.krakow.parking.model.SctRule;
import pl.krakow.parking.model.SpotCategory;
import pl.krakow.parking.model.User;
import pl.krakow.parking.model.UserRole;
import pl.krakow.parking.model.UserStatus;
import pl.krakow.parking.model.Vehicle;
import pl.krakow.parking.model.Zone;
import pl.krakow.parking.repository.ParkingLotRepository;
import pl.krakow.parking.repository.PriceRepository;
import pl.krakow.parking.repository.SctRuleRepository;
import pl.krakow.parking.repository.UserRepository;
import pl.krakow.parking.repository.VehicleRepository;
import pl.krakow.parking.repository.ZoneRepository;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final GeometryFactory GEOMETRY_FACTORY = new GeometryFactory(new PrecisionModel(), 4326);
    private static final Set<String> PRIVATE_PARKING_NAMES = Set.of(
        "Parking Bonarka City Center",
        "Parking Galeria Kazimierz"
    );

    private final ParkingLotRepository parkingLotRepository;
    private final ZoneRepository zoneRepository;
    private final PriceRepository priceRepository;
    private final SctRuleRepository sctRuleRepository;
    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final Random random = new Random(2026);

    public DataSeeder(
        ParkingLotRepository parkingLotRepository,
        ZoneRepository zoneRepository,
        PriceRepository priceRepository,
        SctRuleRepository sctRuleRepository,
        VehicleRepository vehicleRepository,
        UserRepository userRepository,
        PasswordEncoder passwordEncoder
    ) {
        this.parkingLotRepository = parkingLotRepository;
        this.zoneRepository = zoneRepository;
        this.priceRepository = priceRepository;
        this.sctRuleRepository = sctRuleRepository;
        this.vehicleRepository = vehicleRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        seedUsers();
        seedZonesAndPrices();
        seedParkingSpecificPrices();

        if (parkingLotRepository.count() == 0) {
            seedParkingLots();
            seedParkingSpecificPrices();
            seedSctRules();
        }

        seedVehicles();
    }

    private void seedUsers() {
        ensureUser("Admin", "Krakow", "admin@krakow-parking.local", "Admin123!", Set.of(UserRole.ADMIN));
        ensureUser("Jan", "Kierowca", "user@krakow-parking.local", "User12345!", Set.of(UserRole.USER));
        ensureUser("Anna", "Właściciel", "owner@krakow-parking.local", "Owner123!", Set.of(UserRole.PARKING_OWNER));
        ensureUser("Inspektor", "Parkingowy", "inspector@parking.local", "Inspector123!", Set.of(UserRole.INSPECTOR));
    }

    private void ensureUser(String firstName, String lastName, String email, String password, Set<UserRole> roles) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            return;
        }

        userRepository.save(User.builder()
            .firstName(firstName)
            .lastName(lastName)
            .email(email)
            .passwordHash(passwordEncoder.encode(password))
            .roles(new HashSet<>(roles))
            .status(UserStatus.ACTIVE)
            .build());
    }

    private void seedZonesAndPrices() {
        Zone zoneA = ensureZone(
            ParkingZone.ZONE_A,
            "Strefa A",
            "Centralna strefa parkowania z najwyzszymi stawkami testowymi."
        );
        Zone zoneB = ensureZone(
            ParkingZone.ZONE_B,
            "Strefa B",
            "Srodmiejska strefa parkowania ze srednimi stawkami testowymi."
        );
        Zone zoneC = ensureZone(
            ParkingZone.ZONE_C,
            "Strefa C",
            "Peryferyjna strefa parkowania z najnizszymi stawkami testowymi."
        );

        ensurePrice(
            zoneA,
            BigDecimal.valueOf(6),
            BigDecimal.valueOf(7),
            BigDecimal.valueOf(8),
            BigDecimal.valueOf(6),
            BigDecimal.valueOf(55)
        );
        ensurePrice(
            zoneB,
            BigDecimal.valueOf(4),
            BigDecimal.valueOf(5),
            BigDecimal.valueOf(6),
            BigDecimal.valueOf(4),
            BigDecimal.valueOf(38)
        );
        ensurePrice(
            zoneC,
            BigDecimal.valueOf(2),
            BigDecimal.valueOf(3),
            BigDecimal.valueOf(4),
            BigDecimal.valueOf(2),
            BigDecimal.valueOf(22)
        );
    }

    private Zone ensureZone(ParkingZone code, String name, String description) {
        return zoneRepository.findByCode(code)
            .orElseGet(() -> zoneRepository.save(Zone.builder()
                .code(code)
                .name(name)
                .description(description)
                .build()));
    }

    private void ensurePrice(
        Zone zone,
        BigDecimal firstHourPrice,
        BigDecimal secondHourPrice,
        BigDecimal thirdHourPrice,
        BigDecimal nextHourPrice,
        BigDecimal dailyPrice
    ) {
        if (priceRepository.findByZoneCode(zone.getCode()).isPresent()) {
            return;
        }

        priceRepository.save(Price.builder()
            .zone(zone)
            .firstHourPrice(firstHourPrice)
            .secondHourPrice(secondHourPrice)
            .thirdHourPrice(thirdHourPrice)
            .nextHourPrice(nextHourPrice)
            .dailyPrice(dailyPrice)
            .build());
    }

    private void seedParkingSpecificPrices() {
        parkingLotRepository.findAll().stream()
            .filter(parkingLot -> "PRIVATE".equals(parkingLot.getParkingType())
                || PRIVATE_PARKING_NAMES.contains(parkingLot.getName()))
            .forEach(parkingLot -> ensureParkingPrice(
                ensurePrivateParkingType(parkingLot),
                BigDecimal.valueOf(8),
                BigDecimal.valueOf(8),
                BigDecimal.valueOf(8),
                BigDecimal.valueOf(7),
                BigDecimal.valueOf(70)
            ));
    }

    private ParkingLot ensurePrivateParkingType(ParkingLot parkingLot) {
        if ("PRIVATE".equals(parkingLot.getParkingType())) {
            return parkingLot;
        }

        parkingLot.setParkingType("PRIVATE");
        return parkingLotRepository.save(parkingLot);
    }

    private void ensureParkingPrice(
        ParkingLot parkingLot,
        BigDecimal firstHourPrice,
        BigDecimal secondHourPrice,
        BigDecimal thirdHourPrice,
        BigDecimal nextHourPrice,
        BigDecimal dailyPrice
    ) {
        if (priceRepository.findByParkingLotId(parkingLot.getId()).isPresent()) {
            return;
        }

        priceRepository.save(Price.builder()
            .parkingLot(parkingLot)
            .firstHourPrice(firstHourPrice)
            .secondHourPrice(secondHourPrice)
            .thirdHourPrice(thirdHourPrice)
            .nextHourPrice(nextHourPrice)
            .dailyPrice(dailyPrice)
            .build());
    }

    private void seedParkingLots() {
        User ownerUser = userRepository.findByEmailIgnoreCase("owner@krakow-parking.local").orElse(null);
        User adminUser = userRepository.findByEmailIgnoreCase("admin@krakow-parking.local").orElse(null);

        createParking("Parking Galeria Krakowska", "ul. Pawia 5, Kraków", ParkingZone.ZONE_A, 50.0670, 19.9450, 500, "PUBLIC", adminUser, ParkingAccessType.OPEN);
        createParking("Parking Bonarka City Center", "ul. Kamieńskiego 11, Kraków", ParkingZone.ZONE_B, 50.0305, 19.9570, 1100, "PRIVATE", ownerUser, ParkingAccessType.BARRIER);
        createParking("Parking Galeria Kazimierz", "ul. Podgórska 34, Kraków", ParkingZone.ZONE_A, 50.0475, 19.9560, 650, "PRIVATE", ownerUser, ParkingAccessType.BARRIER);
        createParking("Parking P+R Czerwone Maki", "ul. Czerwone Maki, Kraków", ParkingZone.ZONE_C, 50.0260, 19.8890, 250, "PARK_AND_RIDE", adminUser, ParkingAccessType.OPEN);
        createParking("Parking P+R Bieżanów", "ul. Bieżanowska, Kraków", ParkingZone.ZONE_C, 50.0140, 20.0230, 200, "PARK_AND_RIDE", adminUser, ParkingAccessType.OPEN);
        createParking("Parking Rynek Główny", "Rynek Główny, Kraków", ParkingZone.ZONE_A, 50.0615, 19.9370, 120, "UNDERGROUND", adminUser, ParkingAccessType.BARRIER);
        createParking("Parking Wawel", "ul. Powiśle, Kraków", ParkingZone.ZONE_A, 50.0540, 19.9355, 80, "PUBLIC", adminUser, ParkingAccessType.OPEN);
        createParking("Parking ICE Kraków", "ul. Marii Konopnickiej 17, Kraków", ParkingZone.ZONE_B, 50.0500, 19.9250, 300, "PUBLIC", adminUser, ParkingAccessType.OPEN);
    }

    private void createParking(
        String name,
        String address,
        ParkingZone zone,
        double latitude,
        double longitude,
        int totalSpots,
        String parkingType,
        User owner,
        ParkingAccessType accessType
    ) {
        int occupiedSpots = calculateOccupied(totalSpots);
        int regular = (int) Math.round(totalSpots * 0.7);
        int ev = (int) Math.round(totalSpots * 0.1);
        int disabled = (int) Math.round(totalSpots * 0.1);
        int sctReady = totalSpots - regular - ev - disabled;
        int occupiedSct = allocateOccupied(sctReady, occupiedSpots, totalSpots);
        ParkingLot parkingLot = ParkingLot.builder()
            .name(name)
            .address(address)
            .description("Testowy parking typu %s w strefie %s.".formatted(parkingType, zone))
            .status(ParkingLotStatus.ACTIVE)
            .zone(zone)
            .location(createPoint(longitude, latitude))
            .totalSpots(totalSpots)
            .occupiedSpots(occupiedSpots)
            .totalSctSpots(sctReady)
            .occupiedSctSpots(occupiedSct)
            .openingHours("24/7")
            .parkingType(parkingType)
            .accessType(accessType)
            .owner(owner)
            .build();

        addSpotBreakdown(parkingLot, totalSpots, occupiedSpots);

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
        ensurePublicVehicle("KR1234A", "Volkswagen", "Passat", FuelType.DIESEL, EmissionStandard.EURO_3, 2011);
        ensurePublicVehicle("KR5678B", "Toyota", "Corolla", FuelType.PETROL, EmissionStandard.EURO_5, 2018);
        ensurePublicVehicle("KR9EV22", "Tesla", "Model 3", FuelType.ELECTRIC, EmissionStandard.ELECTRIC, 2022);

        User testUser = userRepository.findByEmailIgnoreCase("user@krakow-parking.local").orElse(null);
        if (testUser != null) {
            ensureUserVehicle(
                testUser,
                "KRA1111",
                "Skoda",
                "Octavia",
                FuelType.PETROL,
                EmissionStandard.EURO_6,
                2020,
                true
            );
            ensureUserVehicle(
                testUser,
                "KRA2222",
                "Opel",
                "Astra",
                FuelType.DIESEL,
                EmissionStandard.EURO_4,
                2014,
                false
            );
        }
    }

    private void ensurePublicVehicle(
        String registrationNumber,
        String brand,
        String model,
        FuelType fuelType,
        EmissionStandard emissionStandard,
        int productionYear
    ) {
        if (vehicleRepository.findByRegistrationNumberIgnoreCase(registrationNumber).isPresent()) {
            return;
        }

        vehicleRepository.save(Vehicle.builder()
            .registrationNumber(registrationNumber)
            .brand(brand)
            .model(model)
            .fuelType(fuelType)
            .emissionStandard(emissionStandard)
            .productionYear(productionYear)
            .vehicleType("CAR")
            .sctCompliant(sctVerificationAllowed(fuelType, emissionStandard))
            .active(false)
            .build());
    }

    private void ensureUserVehicle(
        User user,
        String registrationNumber,
        String brand,
        String model,
        FuelType fuelType,
        EmissionStandard emissionStandard,
        int productionYear,
        boolean active
    ) {
        if (vehicleRepository.existsByUserEmailIgnoreCaseAndRegistrationNumberIgnoreCase(
            user.getEmail(),
            registrationNumber
        )) {
            return;
        }

        vehicleRepository.save(Vehicle.builder()
            .user(user)
            .registrationNumber(registrationNumber)
            .brand(brand)
            .model(model)
            .fuelType(fuelType)
            .emissionStandard(emissionStandard)
            .productionYear(productionYear)
            .vehicleType("CAR")
            .sctCompliant(sctVerificationAllowed(fuelType, emissionStandard))
            .active(active)
            .build());
    }

    private boolean sctVerificationAllowed(FuelType fuelType, EmissionStandard emissionStandard) {
        return fuelType == FuelType.ELECTRIC || emissionStandard.isAtLeast(EmissionStandard.EURO_5);
    }

    private org.locationtech.jts.geom.Point createPoint(double longitude, double latitude) {
        org.locationtech.jts.geom.Point point = GEOMETRY_FACTORY.createPoint(new Coordinate(longitude, latitude));
        point.setSRID(4326);
        return point;
    }
}

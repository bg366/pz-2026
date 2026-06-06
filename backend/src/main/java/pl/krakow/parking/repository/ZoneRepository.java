package pl.krakow.parking.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import pl.krakow.parking.model.ParkingZone;
import pl.krakow.parking.model.Zone;

public interface ZoneRepository extends JpaRepository<Zone, Long> {

    Optional<Zone> findByCode(ParkingZone code);
}

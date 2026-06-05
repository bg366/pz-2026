package pl.krakow.parking.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import pl.krakow.parking.model.ParkingZone;
import pl.krakow.parking.model.Price;

public interface PriceRepository extends JpaRepository<Price, Long> {

    Optional<Price> findByZoneCode(ParkingZone zone);

    Optional<Price> findByParkingLotId(Long parkingLotId);
}

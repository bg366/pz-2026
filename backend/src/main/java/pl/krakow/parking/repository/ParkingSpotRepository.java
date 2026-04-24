package pl.krakow.parking.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pl.krakow.parking.model.ParkingSpot;

public interface ParkingSpotRepository extends JpaRepository<ParkingSpot, Long> {
}

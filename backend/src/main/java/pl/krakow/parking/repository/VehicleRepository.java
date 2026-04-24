package pl.krakow.parking.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import pl.krakow.parking.model.Vehicle;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    Optional<Vehicle> findByRegistrationNumberIgnoreCase(String registrationNumber);
}

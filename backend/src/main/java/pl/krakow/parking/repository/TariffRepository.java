package pl.krakow.parking.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import pl.krakow.parking.model.Tariff;

public interface TariffRepository extends JpaRepository<Tariff, Long> {

    List<Tariff> findByParkingLotIdOrderByIdAsc(Long parkingLotId);
}

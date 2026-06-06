package pl.krakow.parking.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import pl.krakow.parking.model.IotDevice;

public interface IotDeviceRepository extends JpaRepository<IotDevice, Long> {

    Optional<IotDevice> findByExternalDeviceId(String externalDeviceId);

    List<IotDevice> findAllByOrderByParkingLotIdAscExternalDeviceIdAsc();
}

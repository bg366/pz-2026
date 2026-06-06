package pl.krakow.parking.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import pl.krakow.parking.model.IotSensorReading;

public interface IotSensorReadingRepository extends JpaRepository<IotSensorReading, Long> {

    List<IotSensorReading> findTop10ByDeviceIdOrderByRecordedAtDesc(Long deviceId);
}

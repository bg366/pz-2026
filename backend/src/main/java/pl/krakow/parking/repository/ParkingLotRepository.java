package pl.krakow.parking.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pl.krakow.parking.model.ParkingLot;
import pl.krakow.parking.model.ParkingZone;

public interface ParkingLotRepository extends JpaRepository<ParkingLot, Long> {

    @Query(value = """
        SELECT p.*
        FROM parking_lots p
        WHERE ST_DWithin(
            p.location::geography,
            ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
            :radiusMeters
        )
        ORDER BY ST_Distance(
            p.location::geography,
            ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
        ) ASC
        """, nativeQuery = true)
    List<ParkingLot> findNearby(
        @Param("lat") double lat,
        @Param("lng") double lng,
        @Param("radiusMeters") double radiusMeters
    );

    List<ParkingLot> findByZone(ParkingZone zone);
}

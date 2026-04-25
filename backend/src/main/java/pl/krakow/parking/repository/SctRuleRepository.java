package pl.krakow.parking.repository;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pl.krakow.parking.model.FuelType;
import pl.krakow.parking.model.ParkingZone;
import pl.krakow.parking.model.SctRule;

public interface SctRuleRepository extends JpaRepository<SctRule, Long> {

    List<SctRule> findAllByOrderByZoneAscFuelTypeAscValidFromDesc();

    @Query("""
        select r
        from SctRule r
        where r.zone = :zone
          and r.fuelType = :fuelType
          and r.validFrom <= :currentDate
          and (r.validTo is null or r.validTo >= :currentDate)
        order by r.validFrom desc
        """)
    List<SctRule> findActiveRules(
        @Param("zone") ParkingZone zone,
        @Param("fuelType") FuelType fuelType,
        @Param("currentDate") LocalDate currentDate
    );
}

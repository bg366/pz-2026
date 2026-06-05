package pl.krakow.parking.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pl.krakow.parking.model.Vehicle;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    Optional<Vehicle> findByRegistrationNumberIgnoreCase(String registrationNumber);

    @Query("""
        select v
        from Vehicle v
        where lower(v.registrationNumber) = lower(:registrationNumber)
        order by case when v.user is null then 0 else 1 end, v.id
        """)
    List<Vehicle> findRegistrationMatches(@Param("registrationNumber") String registrationNumber);

    List<Vehicle> findByUserEmailIgnoreCaseOrderByActiveDescIdAsc(String email);

    Optional<Vehicle> findByIdAndUserEmailIgnoreCase(Long id, String email);

    Optional<Vehicle> findByUserEmailIgnoreCaseAndActiveTrue(String email);

    boolean existsByUserEmailIgnoreCaseAndRegistrationNumberIgnoreCase(String email, String registrationNumber);

    boolean existsByUserEmailIgnoreCaseAndRegistrationNumberIgnoreCaseAndIdNot(
        String email,
        String registrationNumber,
        Long id
    );
}

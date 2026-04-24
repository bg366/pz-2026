package pl.krakow.parking.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "sct_rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SctRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ParkingZone zone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FuelType fuelType;

    @Enumerated(EnumType.STRING)
    @Column(name = "min_emission_standard", nullable = false)
    private EmissionStandard minEmissionStandard;

    @Column(nullable = false)
    private Boolean allowed;

    @Column(nullable = false)
    private LocalDate validFrom;

    private LocalDate validTo;

    @Column(columnDefinition = "TEXT")
    private String description;
}

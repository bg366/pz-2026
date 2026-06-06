package pl.krakow.parking.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "prices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Price {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zone_id")
    private Zone zone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parking_lot_id")
    private ParkingLot parkingLot;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal firstHourPrice;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal secondHourPrice;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal thirdHourPrice;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal nextHourPrice;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal dailyPrice;
}

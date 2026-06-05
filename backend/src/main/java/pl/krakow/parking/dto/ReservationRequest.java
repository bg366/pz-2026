package pl.krakow.parking.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public record ReservationRequest(
    @NotNull Long parkingLotId,
    @NotNull @Future LocalDateTime startsAt,
    @NotNull LocalDateTime endsAt
) {
}

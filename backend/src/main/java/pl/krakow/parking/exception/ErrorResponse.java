package pl.krakow.parking.exception;

import java.time.Instant;
import java.util.List;

public record ErrorResponse(
    int status,
    String message,
    Instant timestamp,
    List<String> errors
) {

    public ErrorResponse(int status, String message, Instant timestamp) {
        this(status, message, timestamp, List.of());
    }
}

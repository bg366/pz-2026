package pl.krakow.parking.dto;

public record CameraEntryResponse(
    boolean canEnter,
    String message,
    String registrationNumber,
    Long sessionId
) {
}

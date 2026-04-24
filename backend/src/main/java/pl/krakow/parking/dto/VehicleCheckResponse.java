package pl.krakow.parking.dto;

public record VehicleCheckResponse(boolean canEnter, String reason) {
}

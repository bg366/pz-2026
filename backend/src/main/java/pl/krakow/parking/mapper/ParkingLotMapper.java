package pl.krakow.parking.mapper;

import java.util.List;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import pl.krakow.parking.dto.ParkingLotCreateRequest;
import pl.krakow.parking.dto.ParkingLotResponse;
import pl.krakow.parking.dto.ParkingLotUpdateRequest;
import pl.krakow.parking.model.ParkingLot;

@Mapper(componentModel = "spring")
public interface ParkingLotMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "location", ignore = true)
    @Mapping(target = "occupiedSpots", constant = "0")
    @Mapping(target = "occupiedSctSpots", constant = "0")
    @Mapping(target = "accessType", ignore = true)
    @Mapping(target = "spots", ignore = true)
    @Mapping(target = "owner", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    ParkingLot toEntity(ParkingLotCreateRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "location", ignore = true)
    @Mapping(target = "accessType", ignore = true)
    @Mapping(target = "spots", ignore = true)
    @Mapping(target = "owner", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateParkingLot(ParkingLotUpdateRequest request, @MappingTarget ParkingLot parkingLot);
}

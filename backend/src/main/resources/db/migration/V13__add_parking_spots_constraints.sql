ALTER TABLE parking_spots
    ADD CONSTRAINT chk_parking_spots_total_non_negative CHECK (total >= 0),
    ADD CONSTRAINT chk_parking_spots_occupied_non_negative CHECK (occupied >= 0),
    ADD CONSTRAINT chk_parking_spots_occupied_not_over_total CHECK (occupied <= total);

CREATE TABLE parking_occupancy_history (
    id BIGSERIAL PRIMARY KEY,
    parking_lot_id BIGINT NOT NULL REFERENCES parking_lots(id) ON DELETE CASCADE,
    occupied_spots INT NOT NULL,
    occupied_sct_spots INT NOT NULL,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_occupancy_history_occupied_non_negative CHECK (occupied_spots >= 0),
    CONSTRAINT chk_occupancy_history_occupied_sct_non_negative CHECK (occupied_sct_spots >= 0)
);

CREATE INDEX idx_occupancy_history_parking_lot ON parking_occupancy_history(parking_lot_id);
CREATE INDEX idx_occupancy_history_recorded_at ON parking_occupancy_history(recorded_at);

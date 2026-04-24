CREATE TABLE parking_spots (
    id BIGSERIAL PRIMARY KEY,
    parking_lot_id BIGINT NOT NULL REFERENCES parking_lots(id) ON DELETE CASCADE,
    category VARCHAR(30) NOT NULL,
    total INT NOT NULL DEFAULT 0,
    occupied INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_parking_spots_lot ON parking_spots(parking_lot_id);

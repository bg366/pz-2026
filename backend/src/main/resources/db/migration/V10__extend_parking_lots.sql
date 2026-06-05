ALTER TABLE parking_lots
    ADD COLUMN description VARCHAR(1000),
    ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN opening_hours VARCHAR(255) NOT NULL DEFAULT '24/7',
    ADD COLUMN total_sct_spots INT NOT NULL DEFAULT 0,
    ADD COLUMN occupied_sct_spots INT NOT NULL DEFAULT 0;

UPDATE parking_lots p
SET total_sct_spots = COALESCE((
        SELECT SUM(ps.total)
        FROM parking_spots ps
        WHERE ps.parking_lot_id = p.id
          AND ps.category = 'SCT_READY'
    ), 0),
    occupied_sct_spots = COALESCE((
        SELECT SUM(ps.occupied)
        FROM parking_spots ps
        WHERE ps.parking_lot_id = p.id
          AND ps.category = 'SCT_READY'
    ), 0);

ALTER TABLE parking_lots
    ADD CONSTRAINT chk_parking_lots_total_spots_non_negative CHECK (total_spots >= 0),
    ADD CONSTRAINT chk_parking_lots_occupied_spots_non_negative CHECK (occupied_spots >= 0),
    ADD CONSTRAINT chk_parking_lots_occupied_not_over_total CHECK (occupied_spots <= total_spots),
    ADD CONSTRAINT chk_parking_lots_total_sct_spots_non_negative CHECK (total_sct_spots >= 0),
    ADD CONSTRAINT chk_parking_lots_occupied_sct_spots_non_negative CHECK (occupied_sct_spots >= 0),
    ADD CONSTRAINT chk_parking_lots_occupied_sct_not_over_total CHECK (occupied_sct_spots <= total_sct_spots),
    ADD CONSTRAINT chk_parking_lots_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'TEMPORARILY_CLOSED'));

CREATE TABLE zones (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE prices (
    id BIGSERIAL PRIMARY KEY,
    zone_id BIGINT REFERENCES zones(id) ON DELETE CASCADE,
    parking_lot_id BIGINT REFERENCES parking_lots(id) ON DELETE CASCADE,
    first_hour_price DECIMAL(10, 2) NOT NULL,
    second_hour_price DECIMAL(10, 2) NOT NULL,
    third_hour_price DECIMAL(10, 2) NOT NULL,
    next_hour_price DECIMAL(10, 2) NOT NULL,
    daily_price DECIMAL(10, 2) NOT NULL,
    CONSTRAINT chk_prices_scope CHECK (
        (zone_id IS NOT NULL AND parking_lot_id IS NULL)
        OR (zone_id IS NULL AND parking_lot_id IS NOT NULL)
    ),
    CONSTRAINT chk_prices_first_hour_non_negative CHECK (first_hour_price >= 0),
    CONSTRAINT chk_prices_second_hour_non_negative CHECK (second_hour_price >= 0),
    CONSTRAINT chk_prices_third_hour_non_negative CHECK (third_hour_price >= 0),
    CONSTRAINT chk_prices_next_hour_non_negative CHECK (next_hour_price >= 0),
    CONSTRAINT chk_prices_daily_non_negative CHECK (daily_price >= 0)
);

CREATE INDEX idx_prices_zone ON prices(zone_id);
CREATE INDEX idx_prices_parking_lot ON prices(parking_lot_id);
CREATE UNIQUE INDEX uq_prices_zone_scope ON prices(zone_id) WHERE parking_lot_id IS NULL;
CREATE UNIQUE INDEX uq_prices_parking_lot_scope ON prices(parking_lot_id) WHERE zone_id IS NULL;

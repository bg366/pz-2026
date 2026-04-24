CREATE TABLE tariffs (
    id BIGSERIAL PRIMARY KEY,
    parking_lot_id BIGINT NOT NULL REFERENCES parking_lots(id) ON DELETE CASCADE,
    zone VARCHAR(10) NOT NULL,
    day_of_week VARCHAR(10),
    hour_from TIME,
    hour_to TIME,
    price_per_hour DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'PLN'
);

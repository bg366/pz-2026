CREATE TABLE reservations (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parking_lot_id BIGINT NOT NULL REFERENCES parking_lots(id) ON DELETE CASCADE,
    status      VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
    starts_at   TIMESTAMP NOT NULL,
    ends_at     TIMESTAMP NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_reservations_ends_after_starts CHECK (ends_at > starts_at),
    CONSTRAINT chk_reservations_status CHECK (status IN ('CONFIRMED', 'CANCELLED', 'COMPLETED', 'EXPIRED'))
);

CREATE INDEX idx_reservations_user ON reservations(user_id);
CREATE INDEX idx_reservations_parking_lot ON reservations(parking_lot_id);
CREATE INDEX idx_reservations_starts_at ON reservations(starts_at);

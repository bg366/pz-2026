CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reservation_id BIGINT REFERENCES reservations(id) ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_notifications_type CHECK (type IN ('RESERVATION_EXPIRING', 'RESERVATION_EXPIRED')),
    CONSTRAINT uq_notifications_reservation_type UNIQUE (reservation_id, type)
);

ALTER TABLE notifications ADD COLUMN session_id BIGINT REFERENCES parking_sessions(id);

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS chk_notifications_type;
ALTER TABLE notifications ADD CONSTRAINT chk_notifications_type
    CHECK (type IN (
        'RESERVATION_EXPIRING', 'RESERVATION_EXPIRED', 'RESERVATION_CONFIRMED',
        'SESSION_STARTED', 'SESSION_PAID', 'SESSION_ENDED'
    ));

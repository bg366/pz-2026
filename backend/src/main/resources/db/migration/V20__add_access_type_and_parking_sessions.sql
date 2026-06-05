ALTER TABLE parking_lots ADD COLUMN access_type VARCHAR(10) NOT NULL DEFAULT 'BARRIER';

CREATE TABLE parking_sessions (
    id BIGSERIAL PRIMARY KEY,
    parking_lot_id BIGINT NOT NULL REFERENCES parking_lots(id),
    user_id BIGINT REFERENCES users(id),
    registration_number VARCHAR(20) NOT NULL,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    amount DECIMAL(10, 2),
    currency VARCHAR(10) DEFAULT 'PLN',
    payment_token VARCHAR(64),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_session_status CHECK (status IN ('ACTIVE', 'PAYMENT_PENDING', 'PAID', 'CANCELLED')),
    CONSTRAINT uq_session_payment_token UNIQUE (payment_token)
);

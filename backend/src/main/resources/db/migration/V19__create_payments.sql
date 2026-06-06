ALTER TABLE reservations
    DROP CONSTRAINT IF EXISTS chk_reservations_status;

ALTER TABLE reservations
    ADD CONSTRAINT chk_reservations_status
        CHECK (status IN ('CONFIRMED', 'CANCELLED', 'COMPLETED', 'EXPIRED', 'PENDING_PAYMENT'));

CREATE TABLE payments (
    id              BIGSERIAL PRIMARY KEY,
    reservation_id  BIGINT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    amount          NUMERIC(10,2) NOT NULL,
    currency        VARCHAR(3)  NOT NULL DEFAULT 'PLN',
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    token           VARCHAR(64) NOT NULL,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_payments_reservation UNIQUE (reservation_id),
    CONSTRAINT uq_payments_token       UNIQUE (token),
    CONSTRAINT chk_payment_status      CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED'))
);

CREATE INDEX idx_payments_token ON payments(token);

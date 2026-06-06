ALTER TABLE parking_lots
    DROP CONSTRAINT IF EXISTS chk_parking_lots_status;

ALTER TABLE parking_lots
    ADD CONSTRAINT chk_parking_lots_status
        CHECK (status IN ('ACTIVE', 'INACTIVE', 'TEMPORARILY_CLOSED', 'PENDING_APPROVAL'));

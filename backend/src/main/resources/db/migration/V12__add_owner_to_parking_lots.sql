ALTER TABLE parking_lots ADD COLUMN owner_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_parking_lots_owner_id ON parking_lots(owner_id);

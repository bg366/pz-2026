ALTER TABLE vehicles
    ADD COLUMN user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    ADD COLUMN brand VARCHAR(100),
    ADD COLUMN model VARCHAR(100),
    ADD COLUMN production_year INT,
    ADD COLUMN sct_compliant BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN active BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_registration_number_key;

UPDATE vehicles
SET brand = 'Unknown',
    model = vehicle_type,
    production_year = 2015,
    sct_compliant = TRUE
WHERE brand IS NULL;

ALTER TABLE vehicles
    ALTER COLUMN brand SET NOT NULL,
    ALTER COLUMN model SET NOT NULL,
    ALTER COLUMN production_year SET NOT NULL;

ALTER TABLE vehicles
    ADD CONSTRAINT chk_vehicles_production_year CHECK (production_year BETWEEN 1900 AND 2100);

CREATE UNIQUE INDEX uq_vehicles_user_registration
    ON vehicles(user_id, registration_number)
    WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX uq_vehicles_public_registration
    ON vehicles(registration_number)
    WHERE user_id IS NULL;

CREATE INDEX idx_vehicles_user ON vehicles(user_id);

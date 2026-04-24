CREATE TABLE vehicles (
    id BIGSERIAL PRIMARY KEY,
    registration_number VARCHAR(20) NOT NULL UNIQUE,
    fuel_type VARCHAR(20) NOT NULL,
    emission_standard VARCHAR(10) NOT NULL,
    vehicle_type VARCHAR(30) DEFAULT 'CAR',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicles_registration ON vehicles(registration_number);

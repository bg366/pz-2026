CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE parking_lots (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500),
    zone VARCHAR(10) NOT NULL,
    location GEOMETRY(POINT, 4326) NOT NULL,
    total_spots INT NOT NULL DEFAULT 0,
    occupied_spots INT NOT NULL DEFAULT 0,
    parking_type VARCHAR(50) NOT NULL DEFAULT 'PUBLIC',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_parking_lots_location ON parking_lots USING GIST(location);
CREATE INDEX idx_parking_lots_zone ON parking_lots(zone);

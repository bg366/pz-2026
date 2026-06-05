CREATE TABLE iot_devices (
    id                 BIGSERIAL PRIMARY KEY,
    parking_lot_id     BIGINT NOT NULL REFERENCES parking_lots(id) ON DELETE CASCADE,
    external_device_id VARCHAR(100) NOT NULL UNIQUE,
    status             VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    last_seen_at       TIMESTAMP,
    created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_iot_devices_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'ERROR'))
);

CREATE TABLE iot_sensor_readings (
    id          BIGSERIAL PRIMARY KEY,
    device_id   BIGINT NOT NULL REFERENCES iot_devices(id) ON DELETE CASCADE,
    occupied_spots INT NOT NULL,
    recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_iot_readings_occupied_non_negative CHECK (occupied_spots >= 0)
);

CREATE INDEX idx_iot_devices_parking_lot ON iot_devices(parking_lot_id);
CREATE INDEX idx_iot_devices_external_id ON iot_devices(external_device_id);
CREATE INDEX idx_iot_readings_device ON iot_sensor_readings(device_id);
CREATE INDEX idx_iot_readings_recorded_at ON iot_sensor_readings(recorded_at);

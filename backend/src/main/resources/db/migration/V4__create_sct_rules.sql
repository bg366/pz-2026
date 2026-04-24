CREATE TABLE sct_rules (
    id BIGSERIAL PRIMARY KEY,
    zone VARCHAR(10) NOT NULL,
    fuel_type VARCHAR(20) NOT NULL,
    min_emission_standard VARCHAR(10) NOT NULL,
    allowed BOOLEAN NOT NULL DEFAULT TRUE,
    valid_from DATE NOT NULL,
    valid_to DATE,
    description TEXT
);

CREATE INDEX idx_sct_rules_zone ON sct_rules(zone);

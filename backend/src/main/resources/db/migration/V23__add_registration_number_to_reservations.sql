ALTER TABLE reservations ADD COLUMN registration_number VARCHAR(20) NOT NULL DEFAULT 'NIEZNANY';
ALTER TABLE reservations ALTER COLUMN registration_number DROP DEFAULT;

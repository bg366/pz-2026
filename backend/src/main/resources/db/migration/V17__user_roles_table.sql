CREATE TABLE user_roles (
    user_id BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role    VARCHAR(20) NOT NULL,
    PRIMARY KEY (user_id, role),
    CONSTRAINT chk_user_role CHECK (role IN ('ADMIN', 'USER', 'PARKING_OWNER'))
);

INSERT INTO user_roles (user_id, role)
SELECT id, role FROM users;

ALTER TABLE users DROP COLUMN role;

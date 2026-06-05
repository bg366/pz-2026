ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS chk_user_role;
ALTER TABLE user_roles ADD CONSTRAINT chk_user_role
    CHECK (role IN ('ADMIN', 'USER', 'PARKING_OWNER', 'INSPECTOR'));

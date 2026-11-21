-- Clerk owns authentication credentials. Keep legacy rows and role values intact.
ALTER TABLE users
    ADD COLUMN clerk_user_id VARCHAR(255);

ALTER TABLE users
    ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE users
    ADD CONSTRAINT uq_users_clerk_user_id UNIQUE (clerk_user_id);

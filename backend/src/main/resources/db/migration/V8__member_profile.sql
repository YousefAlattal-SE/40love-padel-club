-- Application-specific member profile fields. Existing authentication fields and rows stay intact.
ALTER TABLE users
    ADD COLUMN date_of_birth DATE,
    ADD COLUMN gender VARCHAR(32),
    ADD COLUMN skill_level VARCHAR(24);

ALTER TABLE users
    ADD CONSTRAINT chk_users_profile_gender
        CHECK (gender IS NULL OR gender IN ('female', 'male', 'non_binary', 'prefer_not_to_say')),
    ADD CONSTRAINT chk_users_profile_skill_level
        CHECK (skill_level IS NULL OR skill_level IN ('beginner', 'intermediate', 'advanced', 'open'));

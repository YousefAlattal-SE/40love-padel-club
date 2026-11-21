-- Fix max_players column type to match Hibernate integer expectation
ALTER TABLE matches ALTER COLUMN max_players TYPE INTEGER;

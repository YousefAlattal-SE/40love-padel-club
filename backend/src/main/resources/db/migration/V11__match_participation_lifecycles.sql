ALTER TABLE public.match_waitlist
    ADD COLUMN lifecycle_id uuid NOT NULL DEFAULT gen_random_uuid(),
    ADD UNIQUE (lifecycle_id);
ALTER TABLE public.match_reservations
    ADD COLUMN lifecycle_id uuid NOT NULL DEFAULT gen_random_uuid(),
    ADD UNIQUE (lifecycle_id);

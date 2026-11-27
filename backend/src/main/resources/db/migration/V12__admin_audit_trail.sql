-- Security item 8.2: persistent, append-only admin audit trail.
-- The runtime role may add and read audit rows; it can never change or remove them.

REVOKE ALL ON TABLE public.audit_logs FROM PUBLIC;
REVOKE ALL ON TABLE public.audit_logs FROM fortylove_app;
GRANT SELECT, INSERT ON public.audit_logs TO fortylove_app;
GRANT USAGE ON SEQUENCE public.audit_logs_id_seq TO fortylove_app;

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id, created_at DESC);

DO $verify$
BEGIN
    -- Fail closed if ownership or installation-specific ACLs make the trail mutable.
    IF EXISTS (SELECT 1 FROM pg_class
               WHERE oid = 'public.audit_logs'::regclass AND relowner = 'fortylove_app'::regrole)
       OR has_table_privilege('fortylove_app', 'public.audit_logs',
                              'UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES,INSERT WITH GRANT OPTION')
       OR has_any_column_privilege('fortylove_app', 'public.audit_logs', 'UPDATE,REFERENCES')
       OR NOT has_table_privilege('fortylove_app', 'public.audit_logs', 'INSERT')
       OR NOT has_sequence_privilege('fortylove_app', 'public.audit_logs_id_seq', 'USAGE')
    THEN
        RAISE EXCEPTION 'Admin audit trail privileges are unsafe; review ownership and grants';
    END IF;
END
$verify$;

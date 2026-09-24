-- Custom migration: make audit_logs append-only (see docs/decisions.md and evaluator watchlist D-items).
-- Any UPDATE or DELETE on audit_logs raises an error, even from the application's own DB user.
CREATE OR REPLACE FUNCTION prevent_audit_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only (% not allowed)', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER trg_audit_logs_append_only
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_change();

-- Phase 14: Departure Handling
-- When a user is removed from hierarchy_assignments, clean up their delegations
-- and unlink their subordinates

CREATE OR REPLACE FUNCTION handle_hierarchy_removal()
RETURNS TRIGGER AS $$
BEGIN
  -- Remove all account delegations for the departing user
  DELETE FROM account_delegations WHERE delegated_to = OLD.user_id;

  -- If manager is removed, unlink their reps
  IF OLD.role_tier = 'manager' THEN
    UPDATE hierarchy_assignments SET parent_user_id = NULL
    WHERE parent_user_id = OLD.user_id AND role_tier = 'rep';
  END IF;

  -- If VP is removed, unlink their managers
  IF OLD.role_tier = 'vp' THEN
    UPDATE hierarchy_assignments SET parent_user_id = NULL
    WHERE parent_user_id = OLD.user_id AND role_tier = 'manager';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_hierarchy_removal ON hierarchy_assignments;
CREATE TRIGGER trigger_hierarchy_removal
  BEFORE DELETE ON hierarchy_assignments
  FOR EACH ROW EXECUTE FUNCTION handle_hierarchy_removal();

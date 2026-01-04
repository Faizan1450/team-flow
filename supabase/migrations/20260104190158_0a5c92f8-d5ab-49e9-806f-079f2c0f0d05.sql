-- Add unique constraint on teammates.user_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'teammates_user_id_key' 
    AND conrelid = 'teammates'::regclass
  ) THEN
    ALTER TABLE public.teammates ADD CONSTRAINT teammates_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Now update the approve_registration function with proper conflict handling
CREATE OR REPLACE FUNCTION public.approve_registration(
  _pending_id uuid,
  _role app_role,
  _daily_capacity integer DEFAULT 8,
  _working_days integer[] DEFAULT ARRAY[1, 2, 3, 4, 5]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _full_name text;
  _email text;
BEGIN
  -- Get the pending registration
  SELECT user_id, full_name, email INTO _user_id, _full_name, _email
  FROM pending_registrations
  WHERE id = _pending_id AND status = 'pending';
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Pending registration not found or already processed';
  END IF;
  
  -- Add role (use ON CONFLICT to handle duplicates gracefully)
  INSERT INTO user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- If teammate role, create teammate record
  IF _role = 'teammate' THEN
    INSERT INTO teammates (user_id, name, email, daily_capacity, working_days, created_by)
    VALUES (_user_id, _full_name, _email, _daily_capacity, _working_days, auth.uid())
    ON CONFLICT (user_id) DO UPDATE SET
      daily_capacity = EXCLUDED.daily_capacity,
      working_days = EXCLUDED.working_days;
  END IF;
  
  -- Update pending registration status
  UPDATE pending_registrations
  SET status = 'approved',
      reviewed_at = now(),
      reviewed_by = auth.uid()
  WHERE id = _pending_id;
END;
$$;
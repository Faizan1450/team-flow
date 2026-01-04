-- Update promote_to_leader to create/keep teammate record instead of deleting it
CREATE OR REPLACE FUNCTION public.promote_to_leader(_user_id uuid, _daily_capacity integer DEFAULT 8, _working_days integer[] DEFAULT ARRAY[1, 2, 3, 4, 5])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _profile profiles%ROWTYPE;
BEGIN
  -- Get profile info
  SELECT * INTO _profile FROM profiles WHERE id = _user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Remove teammate role if exists
  DELETE FROM user_roles WHERE user_id = _user_id AND role = 'teammate';
  
  -- Add leader role if not exists
  INSERT INTO user_roles (user_id, role)
  VALUES (_user_id, 'leader')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Create or update teammate record (leaders can also receive tasks)
  INSERT INTO teammates (name, user_id, daily_capacity, working_days, created_by, email, job_role)
  VALUES (
    _profile.full_name,
    _user_id,
    _daily_capacity,
    _working_days,
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = _user_id),
    'Leader'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    daily_capacity = EXCLUDED.daily_capacity,
    working_days = EXCLUDED.working_days,
    job_role = 'Leader';
END;
$$;
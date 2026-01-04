-- Function to promote a user to leader (removes teammate record, changes role)
CREATE OR REPLACE FUNCTION public.promote_to_leader(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Remove teammate role if exists
  DELETE FROM user_roles WHERE user_id = _user_id AND role = 'teammate';
  
  -- Add leader role if not exists
  INSERT INTO user_roles (user_id, role)
  VALUES (_user_id, 'leader')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Remove from teammates table (so they don't appear in capacity grid)
  DELETE FROM teammates WHERE user_id = _user_id;
END;
$$;

-- Function to demote a leader to teammate (creates teammate record, changes role)
CREATE OR REPLACE FUNCTION public.demote_to_teammate(
  _user_id uuid, 
  _daily_capacity integer DEFAULT 8, 
  _working_days integer[] DEFAULT ARRAY[1, 2, 3, 4, 5]
)
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

  -- Remove leader role if exists
  DELETE FROM user_roles WHERE user_id = _user_id AND role = 'leader';
  
  -- Add teammate role if not exists
  INSERT INTO user_roles (user_id, role)
  VALUES (_user_id, 'teammate')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Create teammate record if not exists
  INSERT INTO teammates (name, user_id, daily_capacity, working_days, created_by)
  VALUES (
    _profile.full_name,
    _user_id,
    _daily_capacity,
    _working_days,
    auth.uid()
  )
  ON CONFLICT DO NOTHING;
END;
$$;
-- Create pending_registrations table for approval flow
CREATE TABLE public.pending_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  full_name text NOT NULL,
  username text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid
);

-- Enable RLS
ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;

-- Owner can view all pending registrations
CREATE POLICY "Owner can view all pending registrations"
ON public.pending_registrations
FOR SELECT
USING (has_role(auth.uid(), 'owner'));

-- Owner can update pending registrations
CREATE POLICY "Owner can update pending registrations"
ON public.pending_registrations
FOR UPDATE
USING (has_role(auth.uid(), 'owner'));

-- Owner can delete pending registrations
CREATE POLICY "Owner can delete pending registrations"
ON public.pending_registrations
FOR DELETE
USING (has_role(auth.uid(), 'owner'));

-- Allow new registrations to insert their own pending record
-- This needs to be done by a trigger since users can't query their own roles during signup
-- We'll use a service role function instead

-- Create function to add pending registration (called by trigger on auth.users)
CREATE OR REPLACE FUNCTION public.handle_new_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user already has a role (e.g., owner created manually)
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    -- Add to pending registrations
    INSERT INTO public.pending_registrations (user_id, email, full_name, username)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User'),
      COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.email)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for new user registrations
CREATE TRIGGER on_auth_user_created_pending
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_registration();

-- Function to approve a registration
CREATE OR REPLACE FUNCTION public.approve_registration(
  _pending_id uuid,
  _role app_role,
  _daily_capacity integer DEFAULT 8,
  _working_days integer[] DEFAULT ARRAY[1,2,3,4,5]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pending_record pending_registrations%ROWTYPE;
BEGIN
  -- Get the pending registration
  SELECT * INTO _pending_record FROM pending_registrations WHERE id = _pending_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending registration not found or already processed';
  END IF;

  -- Assign the role
  INSERT INTO user_roles (user_id, role) VALUES (_pending_record.user_id, _role);

  -- If teammate, create teammate record
  IF _role = 'teammate' THEN
    INSERT INTO teammates (name, email, user_id, daily_capacity, working_days, created_by)
    VALUES (
      _pending_record.full_name,
      _pending_record.email,
      _pending_record.user_id,
      _daily_capacity,
      _working_days,
      auth.uid()
    );
  END IF;

  -- Mark as approved
  UPDATE pending_registrations 
  SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = _pending_id;
END;
$$;

-- Function to reject a registration
CREATE OR REPLACE FUNCTION public.reject_registration(_pending_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE pending_registrations 
  SET status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = _pending_id AND status = 'pending';
END;
$$;
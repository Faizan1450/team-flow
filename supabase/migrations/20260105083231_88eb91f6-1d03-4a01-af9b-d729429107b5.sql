-- Create leave_balances table
CREATE TABLE public.leave_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teammate_id UUID NOT NULL REFERENCES public.teammates(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  casual_leave_balance NUMERIC NOT NULL DEFAULT 12,
  sick_leave_balance NUMERIC NOT NULL DEFAULT 12,
  comp_off_balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(teammate_id, year)
);

-- Create leave_requests table
CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teammate_id UUID NOT NULL REFERENCES public.teammates(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('casual', 'sick', 'comp_off')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count NUMERIC NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by UUID REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comp_off_requests table (for earning comp-off from extra work)
CREATE TABLE public.comp_off_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teammate_id UUID NOT NULL REFERENCES public.teammates(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  hours_worked NUMERIC NOT NULL,
  days_earned NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by UUID REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comp_off_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for leave_balances
CREATE POLICY "Owner and leaders can view all leave balances"
ON public.leave_balances FOR SELECT
USING (is_owner_or_leader(auth.uid()));

CREATE POLICY "Owner and leaders can insert leave balances"
ON public.leave_balances FOR INSERT
WITH CHECK (is_owner_or_leader(auth.uid()));

CREATE POLICY "Owner and leaders can update leave balances"
ON public.leave_balances FOR UPDATE
USING (is_owner_or_leader(auth.uid()));

CREATE POLICY "Teammates can view their own leave balance"
ON public.leave_balances FOR SELECT
USING (teammate_id = get_teammate_id(auth.uid()));

-- RLS policies for leave_requests
CREATE POLICY "Owner and leaders can view all leave requests"
ON public.leave_requests FOR SELECT
USING (is_owner_or_leader(auth.uid()));

CREATE POLICY "Owner and leaders can insert leave requests"
ON public.leave_requests FOR INSERT
WITH CHECK (is_owner_or_leader(auth.uid()));

CREATE POLICY "Owner and leaders can update leave requests"
ON public.leave_requests FOR UPDATE
USING (is_owner_or_leader(auth.uid()));

CREATE POLICY "Teammates can view their own leave requests"
ON public.leave_requests FOR SELECT
USING (teammate_id = get_teammate_id(auth.uid()));

CREATE POLICY "Teammates can insert their own leave requests"
ON public.leave_requests FOR INSERT
WITH CHECK (teammate_id = get_teammate_id(auth.uid()));

-- RLS policies for comp_off_requests
CREATE POLICY "Owner and leaders can view all comp off requests"
ON public.comp_off_requests FOR SELECT
USING (is_owner_or_leader(auth.uid()));

CREATE POLICY "Owner and leaders can insert comp off requests"
ON public.comp_off_requests FOR INSERT
WITH CHECK (is_owner_or_leader(auth.uid()));

CREATE POLICY "Owner and leaders can update comp off requests"
ON public.comp_off_requests FOR UPDATE
USING (is_owner_or_leader(auth.uid()));

CREATE POLICY "Teammates can view their own comp off requests"
ON public.comp_off_requests FOR SELECT
USING (teammate_id = get_teammate_id(auth.uid()));

CREATE POLICY "Teammates can insert their own comp off requests"
ON public.comp_off_requests FOR INSERT
WITH CHECK (teammate_id = get_teammate_id(auth.uid()));

-- Create triggers for updated_at
CREATE TRIGGER update_leave_balances_updated_at
BEFORE UPDATE ON public.leave_balances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comp_off_requests_updated_at
BEFORE UPDATE ON public.comp_off_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to credit monthly leave (1 CL + 1 SL per month)
CREATE OR REPLACE FUNCTION public.credit_monthly_leave()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  -- Insert or update leave balances for all teammates
  INSERT INTO leave_balances (teammate_id, year, casual_leave_balance, sick_leave_balance)
  SELECT id, current_year, 1, 1
  FROM teammates
  ON CONFLICT (teammate_id, year) 
  DO UPDATE SET
    casual_leave_balance = leave_balances.casual_leave_balance + 1,
    sick_leave_balance = leave_balances.sick_leave_balance + 1,
    updated_at = now();
END;
$$;

-- Function to approve leave request and deduct balance
CREATE OR REPLACE FUNCTION public.approve_leave_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _request leave_requests%ROWTYPE;
  _year INTEGER;
BEGIN
  SELECT * INTO _request FROM leave_requests WHERE id = _request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found or already processed';
  END IF;
  
  _year := EXTRACT(YEAR FROM _request.start_date);
  
  -- Deduct from appropriate balance
  IF _request.leave_type = 'casual' THEN
    UPDATE leave_balances 
    SET casual_leave_balance = casual_leave_balance - _request.days_count
    WHERE teammate_id = _request.teammate_id AND year = _year;
  ELSIF _request.leave_type = 'sick' THEN
    UPDATE leave_balances 
    SET sick_leave_balance = sick_leave_balance - _request.days_count
    WHERE teammate_id = _request.teammate_id AND year = _year;
  ELSIF _request.leave_type = 'comp_off' THEN
    UPDATE leave_balances 
    SET comp_off_balance = comp_off_balance - _request.days_count
    WHERE teammate_id = _request.teammate_id AND year = _year;
  END IF;
  
  -- Update request status
  UPDATE leave_requests 
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _request_id;
  
  -- Add time_off entries for each day
  INSERT INTO time_off (teammate_id, date, reason, created_by)
  SELECT _request.teammate_id, d::date, _request.leave_type || ' leave', auth.uid()
  FROM generate_series(_request.start_date, _request.end_date, '1 day'::interval) d;
END;
$$;

-- Function to approve comp-off request and credit balance
CREATE OR REPLACE FUNCTION public.approve_comp_off_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _request comp_off_requests%ROWTYPE;
  _year INTEGER;
BEGIN
  SELECT * INTO _request FROM comp_off_requests WHERE id = _request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comp-off request not found or already processed';
  END IF;
  
  _year := EXTRACT(YEAR FROM _request.work_date);
  
  -- Credit comp-off balance
  INSERT INTO leave_balances (teammate_id, year, comp_off_balance)
  VALUES (_request.teammate_id, _year, _request.days_earned)
  ON CONFLICT (teammate_id, year) 
  DO UPDATE SET
    comp_off_balance = leave_balances.comp_off_balance + _request.days_earned,
    updated_at = now();
  
  -- Update request status
  UPDATE comp_off_requests 
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _request_id;
END;
$$;
-- =====================================================
-- LEAVE MANAGEMENT SYSTEM - Hour-Based Migration
-- =====================================================

-- 1. Modify leave_balances table for hour-based system
-- Add new columns
ALTER TABLE public.leave_balances
ADD COLUMN IF NOT EXISTS total_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS used_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS pending_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS earned_hours NUMERIC DEFAULT 0;

-- Migrate existing data: (casual + sick) × 8 (default capacity) + comp_off × 8 = hours
UPDATE public.leave_balances lb
SET 
  total_hours = COALESCE(lb.casual_leave_balance, 0) * 8 + COALESCE(lb.sick_leave_balance, 0) * 8,
  earned_hours = COALESCE(lb.comp_off_balance, 0) * 8
WHERE total_hours = 0;

-- 2. Modify leave_requests table for hour-based system
ALTER TABLE public.leave_requests
ADD COLUMN IF NOT EXISTS hours_requested NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_partial BOOLEAN DEFAULT false;

-- Migrate existing data: days_count × 8 = hours_requested
UPDATE public.leave_requests
SET hours_requested = COALESCE(days_count, 0) * 8
WHERE hours_requested = 0;

-- 3. Modify time_off table to support partial hours
ALTER TABLE public.time_off
ADD COLUMN IF NOT EXISTS hours NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_approved_leave BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS leave_request_id UUID REFERENCES public.leave_requests(id);

-- 4. Modify comp_off_requests to use hours instead of days_earned
ALTER TABLE public.comp_off_requests
ADD COLUMN IF NOT EXISTS hours_earned NUMERIC DEFAULT 0;

-- Migrate existing data
UPDATE public.comp_off_requests
SET hours_earned = COALESCE(days_earned, 0) * 8
WHERE hours_earned = 0;

-- 5. Drop and recreate credit_monthly_leave function for hour-based allocation
CREATE OR REPLACE FUNCTION public.credit_monthly_leave()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  teammate_record RECORD;
  monthly_hours NUMERIC;
BEGIN
  -- For each teammate, credit 1.5 days worth of hours based on their daily_capacity
  FOR teammate_record IN SELECT id, daily_capacity FROM teammates LOOP
    monthly_hours := 1.5 * teammate_record.daily_capacity;
    
    INSERT INTO leave_balances (teammate_id, year, total_hours, used_hours, pending_hours, earned_hours)
    VALUES (teammate_record.id, current_year, monthly_hours, 0, 0, 0)
    ON CONFLICT (teammate_id, year) 
    DO UPDATE SET
      total_hours = leave_balances.total_hours + monthly_hours,
      updated_at = now();
  END LOOP;
END;
$$;

-- 6. Update approve_leave_request function for hour-based system
CREATE OR REPLACE FUNCTION public.approve_leave_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _request leave_requests%ROWTYPE;
  _year INTEGER;
  _teammate teammates%ROWTYPE;
  _current_date DATE;
  _hours_per_day NUMERIC;
  _remaining_hours NUMERIC;
  _day_hours NUMERIC;
BEGIN
  SELECT * INTO _request FROM leave_requests WHERE id = _request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found or already processed';
  END IF;
  
  _year := EXTRACT(YEAR FROM _request.start_date);
  
  -- Get teammate's daily capacity
  SELECT * INTO _teammate FROM teammates WHERE id = _request.teammate_id;
  
  -- Deduct from total balance
  UPDATE leave_balances 
  SET 
    used_hours = used_hours + _request.hours_requested,
    pending_hours = GREATEST(0, pending_hours - _request.hours_requested)
  WHERE teammate_id = _request.teammate_id AND year = _year;
  
  -- Update request status
  UPDATE leave_requests 
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _request_id;
  
  -- Add time_off entries for each day with hour allocation
  _remaining_hours := _request.hours_requested;
  _current_date := _request.start_date;
  
  WHILE _remaining_hours > 0 AND _current_date <= _request.end_date LOOP
    -- Calculate hours for this day (either full capacity or remaining)
    _hours_per_day := LEAST(_remaining_hours, _teammate.daily_capacity);
    
    INSERT INTO time_off (teammate_id, date, hours, reason, created_by, is_approved_leave, leave_request_id)
    VALUES (_request.teammate_id, _current_date, _hours_per_day, 'Approved leave', auth.uid(), true, _request_id);
    
    _remaining_hours := _remaining_hours - _hours_per_day;
    _current_date := _current_date + 1;
  END LOOP;
END;
$$;

-- 7. Update approve_comp_off_request function for hour-based system
CREATE OR REPLACE FUNCTION public.approve_comp_off_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Credit earned hours (hours worked on off day)
  INSERT INTO leave_balances (teammate_id, year, total_hours, earned_hours)
  VALUES (_request.teammate_id, _year, 0, _request.hours_earned)
  ON CONFLICT (teammate_id, year) 
  DO UPDATE SET
    earned_hours = leave_balances.earned_hours + _request.hours_earned,
    total_hours = leave_balances.total_hours + _request.hours_earned,
    updated_at = now();
  
  -- Update request status
  UPDATE comp_off_requests 
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _request_id;
END;
$$;

-- 8. Create function to reject leave request
CREATE OR REPLACE FUNCTION public.reject_leave_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Release pending hours back
  UPDATE leave_balances 
  SET pending_hours = GREATEST(0, pending_hours - _request.hours_requested)
  WHERE teammate_id = _request.teammate_id AND year = _year;
  
  -- Update request status
  UPDATE leave_requests 
  SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _request_id;
END;
$$;

-- 9. Create function to reject comp-off request
CREATE OR REPLACE FUNCTION public.reject_comp_off_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE comp_off_requests 
  SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _request_id AND status = 'pending';
END;
$$;

-- 10. Create function to get available leave hours for a teammate
CREATE OR REPLACE FUNCTION public.get_available_leave_hours(_teammate_id uuid)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT total_hours + earned_hours - used_hours - pending_hours 
     FROM leave_balances 
     WHERE teammate_id = _teammate_id 
     AND year = EXTRACT(YEAR FROM CURRENT_DATE)),
    0
  );
$$;
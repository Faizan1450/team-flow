-- Update approve_leave_request to use upsert for time_off entries
CREATE OR REPLACE FUNCTION public.approve_leave_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _request leave_requests%ROWTYPE;
  _current_date date;
  _daily_capacity numeric;
  _remaining_hours numeric;
  _hours_for_day numeric;
BEGIN
  -- Get the request
  SELECT * INTO _request FROM leave_requests WHERE id = _request_id;
  
  IF _request IS NULL THEN
    RAISE EXCEPTION 'Leave request not found';
  END IF;
  
  IF _request.status != 'pending' THEN
    RAISE EXCEPTION 'Leave request is not pending';
  END IF;
  
  -- Get daily capacity
  SELECT daily_capacity INTO _daily_capacity FROM teammates WHERE id = _request.teammate_id;
  
  -- Update request status
  UPDATE leave_requests 
  SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = _request_id;
  
  -- Update leave balance - subtract from total and move from pending to used
  UPDATE leave_balances 
  SET 
    used_hours = COALESCE(used_hours, 0) + COALESCE(_request.hours_requested, 0),
    pending_hours = GREATEST(0, COALESCE(pending_hours, 0) - COALESCE(_request.hours_requested, 0)),
    updated_at = now()
  WHERE teammate_id = _request.teammate_id AND year = EXTRACT(YEAR FROM _request.start_date);
  
  -- Create time_off entries for each day using upsert
  _remaining_hours := COALESCE(_request.hours_requested, _request.days_count * _daily_capacity);
  _current_date := _request.start_date;
  
  WHILE _current_date <= _request.end_date AND _remaining_hours > 0 LOOP
    _hours_for_day := LEAST(_remaining_hours, _daily_capacity);
    
    -- Use upsert to handle existing records
    INSERT INTO time_off (teammate_id, date, reason, is_approved_leave, leave_request_id, hours, created_by)
    VALUES (_request.teammate_id, _current_date, 'Approved Leave', true, _request_id, _hours_for_day, auth.uid())
    ON CONFLICT (teammate_id, date) 
    DO UPDATE SET 
      reason = 'Approved Leave',
      is_approved_leave = true,
      leave_request_id = _request_id,
      hours = EXCLUDED.hours,
      created_by = auth.uid();
    
    _remaining_hours := _remaining_hours - _hours_for_day;
    _current_date := _current_date + 1;
  END LOOP;
END;
$$;
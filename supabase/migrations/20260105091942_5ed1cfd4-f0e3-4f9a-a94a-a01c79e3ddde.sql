-- Drop the check constraint on leave_type that's causing the issue
ALTER TABLE public.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_leave_type_check;

-- Update leave_type to have a sensible default for the hour-based system
ALTER TABLE public.leave_requests ALTER COLUMN leave_type SET DEFAULT 'leave';
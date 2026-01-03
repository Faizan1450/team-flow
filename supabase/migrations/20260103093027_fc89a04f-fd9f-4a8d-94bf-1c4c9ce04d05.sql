-- Create time_off table for manual off days
CREATE TABLE public.time_off (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teammate_id UUID NOT NULL REFERENCES public.teammates(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(teammate_id, date)
);

-- Enable RLS
ALTER TABLE public.time_off ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Owner and leaders can view all time off"
ON public.time_off FOR SELECT
USING (is_owner_or_leader(auth.uid()));

CREATE POLICY "Owner and leaders can insert time off"
ON public.time_off FOR INSERT
WITH CHECK (is_owner_or_leader(auth.uid()));

CREATE POLICY "Owner and leaders can delete time off"
ON public.time_off FOR DELETE
USING (is_owner_or_leader(auth.uid()));

CREATE POLICY "Teammates can view their own time off"
ON public.time_off FOR SELECT
USING (teammate_id = get_teammate_id(auth.uid()));
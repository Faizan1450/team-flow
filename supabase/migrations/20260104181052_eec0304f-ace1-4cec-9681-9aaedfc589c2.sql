-- Allow users to view their own pending registration
CREATE POLICY "Users can view their own pending registration"
ON public.pending_registrations
FOR SELECT
USING (user_id = auth.uid());
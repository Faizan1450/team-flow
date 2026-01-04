-- Add recurrence fields to tasks table
ALTER TABLE public.tasks 
ADD COLUMN is_recurring boolean NOT NULL DEFAULT false,
ADD COLUMN recurrence_type text CHECK (recurrence_type IN ('none', 'daily', 'custom')) DEFAULT 'none',
ADD COLUMN recurrence_interval integer DEFAULT 1,
ADD COLUMN recurrence_end_date date,
ADD COLUMN recurrence_dates date[],
ADD COLUMN parent_task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE;

-- Create index for faster lookups of child tasks
CREATE INDEX idx_tasks_parent_task_id ON public.tasks(parent_task_id);
CREATE INDEX idx_tasks_recurrence ON public.tasks(is_recurring) WHERE is_recurring = true;
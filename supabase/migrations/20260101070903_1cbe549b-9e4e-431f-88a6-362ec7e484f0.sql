-- Create app_role enum for role types
CREATE TYPE public.app_role AS ENUM ('owner', 'leader', 'teammate');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create teammates table for capacity information
CREATE TABLE public.teammates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  job_role TEXT NOT NULL DEFAULT 'Team Member',
  daily_capacity INTEGER NOT NULL DEFAULT 8,
  working_days INTEGER[] NOT NULL DEFAULT ARRAY[1, 2, 3, 4, 5],
  avatar_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL REFERENCES public.teammates(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_by_name TEXT NOT NULL,
  date DATE NOT NULL,
  estimated_hours NUMERIC(4, 2) NOT NULL CHECK (estimated_hours > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
  is_self_assigned BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teammates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Security definer function to check if user is owner or leader
CREATE OR REPLACE FUNCTION public.is_owner_or_leader(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('owner', 'leader')
  )
$$;

-- Function to get teammate id for a user
CREATE OR REPLACE FUNCTION public.get_teammate_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.teammates WHERE user_id = _user_id LIMIT 1
$$;

-- Profiles RLS policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Owner and leaders can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_owner_or_leader(auth.uid()));

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- User roles RLS policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Owner can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owner can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owner can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- Teammates RLS policies
CREATE POLICY "Owner and leaders can view all teammates"
ON public.teammates FOR SELECT
TO authenticated
USING (public.is_owner_or_leader(auth.uid()));

CREATE POLICY "Teammates can view themselves"
ON public.teammates FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Owner can insert teammates"
ON public.teammates FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owner can update teammates"
ON public.teammates FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owner can delete teammates"
ON public.teammates FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- Tasks RLS policies
CREATE POLICY "Owner and leaders can view all tasks"
ON public.tasks FOR SELECT
TO authenticated
USING (public.is_owner_or_leader(auth.uid()));

CREATE POLICY "Teammates can view their own tasks"
ON public.tasks FOR SELECT
TO authenticated
USING (assigned_to = public.get_teammate_id(auth.uid()));

CREATE POLICY "Owner and leaders can insert tasks"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (public.is_owner_or_leader(auth.uid()));

CREATE POLICY "Teammates can insert self-assigned tasks"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (
  assigned_to = public.get_teammate_id(auth.uid()) 
  AND is_self_assigned = true
);

CREATE POLICY "Owner and leaders can update any task"
ON public.tasks FOR UPDATE
TO authenticated
USING (public.is_owner_or_leader(auth.uid()));

CREATE POLICY "Teammates can update their own tasks"
ON public.tasks FOR UPDATE
TO authenticated
USING (assigned_to = public.get_teammate_id(auth.uid()));

CREATE POLICY "Owner and leaders can delete tasks"
ON public.tasks FOR DELETE
TO authenticated
USING (public.is_owner_or_leader(auth.uid()));

CREATE POLICY "Teammates can delete their self-assigned tasks"
ON public.tasks FOR DELETE
TO authenticated
USING (
  assigned_to = public.get_teammate_id(auth.uid()) 
  AND is_self_assigned = true
);

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'username', 'User')
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teammates_updated_at
  BEFORE UPDATE ON public.teammates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for tasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
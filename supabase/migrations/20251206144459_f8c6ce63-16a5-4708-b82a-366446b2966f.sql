-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('player', 'admin', 'turf_owner');

-- Create user_roles table (following security best practices)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'player',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
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

-- Create function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles 
  WHERE user_id = _user_id 
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'turf_owner' THEN 2 
      ELSE 3 
    END
  LIMIT 1
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create turf_owners table
CREATE TABLE public.turf_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  turf_id uuid NOT NULL REFERENCES public.turfs(id) ON DELETE CASCADE,
  is_primary_owner boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, turf_id)
);

-- Enable RLS on turf_owners
ALTER TABLE public.turf_owners ENABLE ROW LEVEL SECURITY;

-- RLS policies for turf_owners
CREATE POLICY "Turf owners viewable by admins and owners"
ON public.turf_owners
FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can manage turf owners"
ON public.turf_owners
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Add active column to turfs table
ALTER TABLE public.turfs ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

-- Update turfs RLS to allow turf owners to update their own turfs
CREATE POLICY "Turf owners can update their turfs"
ON public.turfs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.turf_owners
    WHERE turf_owners.turf_id = turfs.id
    AND turf_owners.user_id = auth.uid()
  )
);

-- Create trigger to auto-assign player role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'player');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();
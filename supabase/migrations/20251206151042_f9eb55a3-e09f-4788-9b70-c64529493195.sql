-- Drop the old admin policy that uses profiles.is_admin
DROP POLICY IF EXISTS "Admins can manage turfs" ON public.turfs;

-- Create new admin policy using has_role function
CREATE POLICY "Admins can manage turfs"
ON public.turfs
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- Create partnership_requests table for turf listing inquiries
CREATE TABLE public.partnership_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  location_address TEXT NOT NULL,
  sport_types TEXT[] NOT NULL,
  amenities TEXT[],
  description TEXT,
  google_maps_link TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partnership_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a partnership request (public form)
CREATE POLICY "Anyone can submit partnership request"
ON public.partnership_requests
FOR INSERT
WITH CHECK (true);

-- Only admins can view partnership requests
CREATE POLICY "Admins can view partnership requests"
ON public.partnership_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Only admins can update partnership requests
CREATE POLICY "Admins can update partnership requests"
ON public.partnership_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_partnership_requests_updated_at
BEFORE UPDATE ON public.partnership_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
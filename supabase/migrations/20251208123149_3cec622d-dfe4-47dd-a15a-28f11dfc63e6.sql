-- Create table for business model sections (editable pitch deck content)
CREATE TABLE public.business_model_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slide_number integer NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.business_model_sections ENABLE ROW LEVEL SECURITY;

-- Only admins can view business model content
CREATE POLICY "Admins can view business model sections"
ON public.business_model_sections
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can manage business model content
CREATE POLICY "Admins can manage business model sections"
ON public.business_model_sections
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_business_model_sections_updated_at
BEFORE UPDATE ON public.business_model_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Extend turfs table with commission fields
ALTER TABLE public.turfs 
ADD COLUMN IF NOT EXISTS commission_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS commission_value numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payout_frequency text DEFAULT NULL;

-- Create platform_settings table for global defaults
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on platform_settings
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage platform settings
CREATE POLICY "Admins can manage platform settings"
ON public.platform_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Platform settings are viewable by admins only
CREATE POLICY "Platform settings viewable by admins"
ON public.platform_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Insert default platform settings
INSERT INTO public.platform_settings (setting_key, setting_value)
VALUES 
  ('default_commission_type', '"percentage"'),
  ('default_commission_value', '10'),
  ('default_payout_frequency', '"weekly"')
ON CONFLICT (setting_key) DO NOTHING;

-- Extend payments table with commission tracking
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS commission_type_used text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS commission_value_used numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payout_id uuid REFERENCES public.payouts(id) DEFAULT NULL;

-- Create index for faster payout queries
CREATE INDEX IF NOT EXISTS idx_payments_payout_id ON public.payments(payout_id);
CREATE INDEX IF NOT EXISTS idx_payments_turf_status ON public.payments(turf_id, status);

-- Add trigger to auto-update updated_at on platform_settings
CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
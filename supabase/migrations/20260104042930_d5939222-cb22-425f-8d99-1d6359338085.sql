-- Add advance payment settings to turfs
ALTER TABLE public.turfs 
ADD COLUMN IF NOT EXISTS allow_advance_payment boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS advance_amount_type text DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS advance_amount_value numeric DEFAULT 50,
ADD COLUMN IF NOT EXISTS allow_pay_at_ground boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.turfs.advance_amount_type IS 'Type of advance: percentage or fixed';
COMMENT ON COLUMN public.turfs.advance_amount_value IS 'Value of advance: percentage (e.g., 50) or fixed amount';
COMMENT ON COLUMN public.turfs.allow_pay_at_ground IS 'Allow booking without online payment';
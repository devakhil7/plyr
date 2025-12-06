-- Add new fields to turfs table for availability/pricing
ALTER TABLE public.turfs 
ADD COLUMN IF NOT EXISTS google_maps_link text,
ADD COLUMN IF NOT EXISTS rules text,
ADD COLUMN IF NOT EXISTS amenities text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cancellation_policy text,
ADD COLUMN IF NOT EXISTS refund_policy text,
ADD COLUMN IF NOT EXISTS opening_hours jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS pricing_rules jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS slot_duration_minutes integer DEFAULT 60,
ADD COLUMN IF NOT EXISTS blocked_slots jsonb DEFAULT '[]';

-- Add is_offline_booking to matches
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS is_offline_booking boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS offline_contact_name text,
ADD COLUMN IF NOT EXISTS offline_contact_phone text;

-- Create payments table
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  turf_id uuid NOT NULL REFERENCES public.turfs(id) ON DELETE CASCADE,
  payer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount_total numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 0,
  turf_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  payment_method text NOT NULL DEFAULT 'other',
  status text NOT NULL DEFAULT 'pending',
  payment_reference text,
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for payments
CREATE POLICY "Payments viewable by turf owners and payers"
ON public.payments
FOR SELECT
USING (
  payer_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.turf_owners 
    WHERE turf_owners.turf_id = payments.turf_id 
    AND turf_owners.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Turf owners can manage payments for their turfs"
ON public.payments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.turf_owners 
    WHERE turf_owners.turf_id = payments.turf_id 
    AND turf_owners.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Create payouts table
CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turf_id uuid NOT NULL REFERENCES public.turfs(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  amount_gross numeric NOT NULL DEFAULT 0,
  amount_fees numeric NOT NULL DEFAULT 0,
  amount_net numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'scheduled',
  payout_reference text,
  payout_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on payouts
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- RLS policies for payouts
CREATE POLICY "Payouts viewable by turf owners"
ON public.payouts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.turf_owners 
    WHERE turf_owners.turf_id = payouts.turf_id 
    AND turf_owners.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can manage payouts"
ON public.payouts
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create discount_codes table
CREATE TABLE public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turf_id uuid NOT NULL REFERENCES public.turfs(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric NOT NULL DEFAULT 0,
  max_uses integer,
  used_count integer DEFAULT 0,
  valid_from timestamp with time zone,
  valid_to timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(turf_id, code)
);

-- Enable RLS on discount_codes
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- RLS policies for discount_codes
CREATE POLICY "Discount codes viewable by everyone"
ON public.discount_codes
FOR SELECT
USING (is_active = true);

CREATE POLICY "Turf owners can manage their discount codes"
ON public.discount_codes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.turf_owners 
    WHERE turf_owners.turf_id = discount_codes.turf_id 
    AND turf_owners.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Create turf_payout_details table for bank details
CREATE TABLE public.turf_payout_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turf_id uuid NOT NULL REFERENCES public.turfs(id) ON DELETE CASCADE UNIQUE,
  account_name text,
  bank_name text,
  account_number text,
  ifsc_code text,
  upi_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on turf_payout_details
ALTER TABLE public.turf_payout_details ENABLE ROW LEVEL SECURITY;

-- RLS policies for turf_payout_details
CREATE POLICY "Turf owners can view their payout details"
ON public.turf_payout_details
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.turf_owners 
    WHERE turf_owners.turf_id = turf_payout_details.turf_id 
    AND turf_owners.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Turf owners can manage their payout details"
ON public.turf_payout_details
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.turf_owners 
    WHERE turf_owners.turf_id = turf_payout_details.turf_id 
    AND turf_owners.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);
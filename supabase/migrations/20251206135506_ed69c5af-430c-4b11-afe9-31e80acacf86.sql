-- Create turf_bookings table to track slot bookings
CREATE TABLE public.turf_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  turf_id UUID NOT NULL REFERENCES public.turfs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  payment_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  razorpay_order_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.turf_bookings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Turf bookings are viewable by everyone"
ON public.turf_bookings
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create bookings"
ON public.turf_bookings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings"
ON public.turf_bookings
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_turf_bookings_turf_date ON public.turf_bookings(turf_id, booking_date);
CREATE INDEX idx_turf_bookings_payment_status ON public.turf_bookings(payment_status);

-- Add trigger for updated_at
CREATE TRIGGER update_turf_bookings_updated_at
BEFORE UPDATE ON public.turf_bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
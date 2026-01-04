-- Add booking_status column to turf_bookings table
ALTER TABLE public.turf_bookings 
ADD COLUMN IF NOT EXISTS booking_status text NOT NULL DEFAULT 'pending_approval';

-- Add require_booking_approval setting to turfs table
ALTER TABLE public.turfs 
ADD COLUMN IF NOT EXISTS require_booking_approval boolean DEFAULT true;

-- Comment on columns
COMMENT ON COLUMN public.turf_bookings.booking_status IS 'Status of booking approval: pending_approval, approved, rejected';
COMMENT ON COLUMN public.turfs.require_booking_approval IS 'If true, unpaid bookings require turf owner approval before slot is confirmed';
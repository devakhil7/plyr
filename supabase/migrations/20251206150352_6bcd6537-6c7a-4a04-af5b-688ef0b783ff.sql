-- Add latitude and longitude columns to turfs table for map location
ALTER TABLE public.turfs ADD COLUMN IF NOT EXISTS latitude numeric;
ALTER TABLE public.turfs ADD COLUMN IF NOT EXISTS longitude numeric;
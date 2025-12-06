-- Add new optional fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS favourite_club text,
ADD COLUMN IF NOT EXISTS favourite_player text,
ADD COLUMN IF NOT EXISTS height_cm integer,
ADD COLUMN IF NOT EXISTS weight_kg integer,
ADD COLUMN IF NOT EXISTS date_of_birth date;
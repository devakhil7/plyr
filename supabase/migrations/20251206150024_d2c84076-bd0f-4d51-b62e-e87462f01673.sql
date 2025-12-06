-- Add owner_email column to turfs table
ALTER TABLE public.turfs ADD COLUMN IF NOT EXISTS owner_email text;
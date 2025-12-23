-- Add 'invited' status to join_status enum for match invites
ALTER TYPE join_status ADD VALUE IF NOT EXISTS 'invited';
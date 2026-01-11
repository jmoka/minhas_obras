-- Add contact fields to obras table
ALTER TABLE obras ADD COLUMN IF NOT EXISTS telefone_dono TEXT;
ALTER TABLE obras ADD COLUMN IF NOT EXISTS email_dono TEXT;

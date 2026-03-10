-- Add CHAT to TicketChannel enum in a separate migration so it is committed before use (PostgreSQL requirement).
DO $$ BEGIN
    ALTER TYPE "TicketChannel" ADD VALUE 'CHAT';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

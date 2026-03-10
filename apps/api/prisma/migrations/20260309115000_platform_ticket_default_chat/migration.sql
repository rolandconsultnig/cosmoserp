-- Set PlatformSupportTicket channel default to CHAT (requires CHAT enum from 20260309105000).
ALTER TABLE "PlatformSupportTicket" ALTER COLUMN "channel" SET DEFAULT 'CHAT';

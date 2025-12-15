-- CreateTable for CalendarSettings if it doesn't exist (migration might have already run)
-- This migration adds default calendar settings for all users who don't have them

-- Insert default calendar settings for users who don't have calendar settings yet
INSERT INTO "CalendarSettings" ("id", "userId", "timezone", "businessHours", "calendar", "slotDuration", "slotsEnabled", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  "User"."id",
  'Australia/Sydney',
  '{"monday":{"enabled":true,"start":"09:00","end":"17:00"},"tuesday":{"enabled":true,"start":"09:00","end":"17:00"},"wednesday":{"enabled":true,"start":"09:00","end":"17:00"},"thursday":{"enabled":true,"start":"09:00","end":"17:00"},"friday":{"enabled":true,"start":"09:00","end":"17:00"},"saturday":{"enabled":false,"start":"09:00","end":"17:00"},"sunday":{"enabled":false,"start":"09:00","end":"17:00"}}',
  'primary',
  60,
  true,
  NOW(),
  NOW()
FROM "User"
WHERE NOT EXISTS (
  SELECT 1 FROM "CalendarSettings" WHERE "CalendarSettings"."userId" = "User"."id"
);

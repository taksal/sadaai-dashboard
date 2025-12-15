-- Delete existing calendar settings (they have incorrect data)
DELETE FROM "CalendarSettings";

-- Insert default calendar settings with properly formatted JSONB
INSERT INTO "CalendarSettings" ("id", "userId", "timezone", "businessHours", "calendar", "slotDuration", "slotsEnabled", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  "User"."id",
  'Australia/Sydney',
  '{"monday":{"enabled":true,"start":"09:00","end":"17:00"},"tuesday":{"enabled":true,"start":"09:00","end":"17:00"},"wednesday":{"enabled":true,"start":"09:00","end":"17:00"},"thursday":{"enabled":true,"start":"09:00","end":"17:00"},"friday":{"enabled":true,"start":"09:00","end":"17:00"},"saturday":{"enabled":false,"start":"09:00","end":"17:00"},"sunday":{"enabled":false,"start":"09:00","end":"17:00"}}'::jsonb,
  'primary',
  60,
  true,
  NOW(),
  NOW()
FROM "User";

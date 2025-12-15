-- Add bookingReference column to Appointment table
ALTER TABLE "Appointment" ADD COLUMN "bookingReference" TEXT;

-- Generate booking references for existing appointments using a subquery
WITH numbered_appointments AS (
  SELECT
    id,
    'BK-' || EXTRACT(YEAR FROM "createdAt") || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY "createdAt")::TEXT, 6, '0') as ref
  FROM "Appointment"
)
UPDATE "Appointment" a
SET "bookingReference" = na.ref
FROM numbered_appointments na
WHERE a.id = na.id AND a."bookingReference" IS NULL;

-- Make bookingReference NOT NULL and UNIQUE
ALTER TABLE "Appointment" ALTER COLUMN "bookingReference" SET NOT NULL;
CREATE UNIQUE INDEX "Appointment_bookingReference_key" ON "Appointment"("bookingReference");
CREATE INDEX "Appointment_bookingReference_idx" ON "Appointment"("bookingReference");

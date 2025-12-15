-- AlterTable
-- Update customerPhone field to support longer phone numbers (up to 100 characters)
ALTER TABLE "Call" ALTER COLUMN "customerPhone" TYPE VARCHAR(100);

-- AlterTable
-- Update customerPhone field in Appointment table for consistency
ALTER TABLE "Appointment" ALTER COLUMN "customerPhone" TYPE VARCHAR(100);

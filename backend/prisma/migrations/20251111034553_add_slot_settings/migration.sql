-- AlterTable
ALTER TABLE "CalendarSettings" ADD COLUMN     "slotDuration" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "slotsEnabled" BOOLEAN NOT NULL DEFAULT true;

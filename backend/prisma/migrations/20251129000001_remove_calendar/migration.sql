-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT IF EXISTS "Appointment_userId_fkey";

-- DropForeignKey
ALTER TABLE "CalendarConnection" DROP CONSTRAINT IF EXISTS "CalendarConnection_userId_fkey";

-- DropTable
DROP TABLE IF EXISTS "Appointment";

-- DropTable
DROP TABLE IF EXISTS "CalendarSettings";

-- DropTable
DROP TABLE IF EXISTS "CalendarConnection";

-- DropTable
DROP TABLE IF EXISTS "CalendarOAuthConfig";

-- AlterTable
ALTER TABLE "User" DROP COLUMN IF EXISTS "googleRefreshToken";
ALTER TABLE "User" DROP COLUMN IF EXISTS "outlookRefreshToken";

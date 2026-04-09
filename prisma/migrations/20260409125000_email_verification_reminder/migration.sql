-- AlterTable
ALTER TABLE "users" ADD COLUMN "email_verification_reminder_pending" BOOLEAN NOT NULL DEFAULT false;

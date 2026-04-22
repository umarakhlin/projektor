-- AlterTable: add email_notified_at column to direct_messages
ALTER TABLE "direct_messages"
  ADD COLUMN "email_notified_at" TIMESTAMP(3);

-- CreateIndex: speed up cron lookup for unread + unsent notifications
CREATE INDEX "direct_messages_email_notified_at_read_at_idx"
  ON "direct_messages" ("email_notified_at", "read_at");

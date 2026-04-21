-- CreateTable
CREATE TABLE "direct_messages" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "direct_messages_recipient_id_read_at_idx" ON "direct_messages"("recipient_id", "read_at");

-- CreateIndex
CREATE INDEX "direct_messages_sender_id_idx" ON "direct_messages"("sender_id");

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

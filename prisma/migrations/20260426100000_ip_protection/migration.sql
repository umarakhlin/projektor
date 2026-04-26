-- Project visibility enum
CREATE TYPE "ProjectVisibility" AS ENUM ('Public', 'NDAGated');

-- Project: visibility column, default to NDAGated. Existing rows
-- explicitly receive NDAGated to make protection retroactive.
ALTER TABLE "projects"
  ADD COLUMN "visibility" "ProjectVisibility" NOT NULL DEFAULT 'NDAGated';

-- Users: track when each user last accepted the platform NDA
ALTER TABLE "users"
  ADD COLUMN "last_nda_accepted_at" TIMESTAMP(3);

-- Audit log of every NDA acceptance (one row per click-through)
CREATE TABLE "nda_acceptances" (
  "id"          TEXT        NOT NULL,
  "user_id"     TEXT        NOT NULL,
  "nda_version" TEXT        NOT NULL,
  "agreed_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ip_hash"     TEXT,
  "user_agent"  TEXT,

  CONSTRAINT "nda_acceptances_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "nda_acceptances_user_id_idx"
  ON "nda_acceptances" ("user_id");
CREATE INDEX "nda_acceptances_agreed_at_idx"
  ON "nda_acceptances" ("agreed_at");

ALTER TABLE "nda_acceptances"
  ADD CONSTRAINT "nda_acceptances_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

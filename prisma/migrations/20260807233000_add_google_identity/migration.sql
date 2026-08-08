-- Store Google's stable OpenID Connect subject separately from the email,
-- which a user can change.
ALTER TABLE "users" ADD COLUMN "google_subject" TEXT;

CREATE UNIQUE INDEX "users_google_subject_key"
    ON "users"("google_subject");

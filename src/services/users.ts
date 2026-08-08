import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export type GoogleProfile = {
  subject: string;
  email: string;
  name: string | null;
  photoUrl: string | null;
};

export class GoogleIdentityConflictError extends Error {
  constructor(email: string) {
    super(`The email ${email} is already linked to another Google account.`);
    this.name = "GoogleIdentityConflictError";
  }
}

const MAX_TRANSACTION_ATTEMPTS = 3;

/**
 * Maps Google's stable OpenID Connect subject to one application user.
 * Profile fields are refreshed because users can change their name, picture,
 * and even email without changing that subject.
 */
export async function syncGoogleProfile(profile: GoogleProfile) {
  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await db().$transaction(
        async (transaction) => {
          const profileFields = {
            email: profile.email,
            name: profile.name,
            photoUrl: profile.photoUrl,
          };

          const matchingIdentity = await transaction.user.findUnique({
            where: { googleSubject: profile.subject },
          });
          if (matchingIdentity) {
            return transaction.user.update({
              where: { id: matchingIdentity.id },
              data: profileFields,
            });
          }

          const matchingEmail = await transaction.user.findUnique({
            where: { email: profile.email },
          });
          if (matchingEmail) {
            if (
              matchingEmail.googleSubject &&
              matchingEmail.googleSubject !== profile.subject
            ) {
              throw new GoogleIdentityConflictError(profile.email);
            }

            return transaction.user.update({
              where: { id: matchingEmail.id },
              data: {
                ...profileFields,
                googleSubject: profile.subject,
              },
            });
          }

          return transaction.user.create({
            data: {
              ...profileFields,
              googleSubject: profile.subject,
            },
          });
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2034" || error.code === "P2002");

      if (!retryable || attempt === MAX_TRANSACTION_ATTEMPTS) {
        throw error;
      }
    }
  }

  throw new Error("Google profile synchronization exhausted its retry loop.");
}

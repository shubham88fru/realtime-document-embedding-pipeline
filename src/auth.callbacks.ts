import type { Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";

import { syncGoogleProfile } from "@/services/users";

type GoogleSignInInput = {
  account?: { provider: string } | null;
  profile?: {
    sub?: unknown;
    email_verified?: unknown;
  };
  user: User;
};

export async function authorizeGoogleSignIn({
  account,
  profile,
  user,
}: GoogleSignInInput): Promise<boolean> {
  if (
    account?.provider !== "google" ||
    typeof profile?.sub !== "string" ||
    profile.email_verified !== true ||
    !user.email
  ) {
    return false;
  }

  const persisted = await syncGoogleProfile({
    subject: profile.sub,
    email: user.email,
    name: user.name ?? null,
    photoUrl: user.image ?? null,
  });

  // The JWT callback receives this object immediately after sign-in.
  user.id = persisted.id;
  return true;
}

export const authSessionCallbacks = {
  async jwt({ token, user }: { token: JWT; user?: User }) {
    if (user?.id) {
      token.sub = user.id;
    }
    return token;
  },
  async session({ session, token }: { session: Session; token: JWT }) {
    if (token.sub) {
      session.user.id = token.sub;
    }
    return session;
  },
};

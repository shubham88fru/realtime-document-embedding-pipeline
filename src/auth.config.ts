import type { NextAuthConfig, Session } from "next-auth";
import Google from "next-auth/providers/google";

const PUBLIC_PATHS = ["/sign-in"] as const;

export function isAuthorized(
  session: Session | null,
  pathname: string,
): boolean {
  if (
    PUBLIC_PATHS.includes(pathname as (typeof PUBLIC_PATHS)[number]) ||
    pathname.startsWith("/api/auth/")
  ) {
    return true;
  }

  return Boolean(session?.user);
}

export const authConfig = {
  providers: [Google],
  // Next.js supplies and validates the Host header used to construct OAuth
  // callback URLs. Auth.js requires frameworks to opt into trusting it.
  trustHost: true,
  pages: {
    signIn: "/sign-in",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  callbacks: {
    authorized({ auth, request }) {
      return isAuthorized(auth, request.nextUrl.pathname);
    },
  },
} satisfies NextAuthConfig;

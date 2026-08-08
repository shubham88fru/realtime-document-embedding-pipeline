import NextAuth from "next-auth";

import {
  authSessionCallbacks,
  authorizeGoogleSignIn,
} from "@/auth.callbacks";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    signIn: authorizeGoogleSignIn,
    ...authSessionCallbacks,
  },
});

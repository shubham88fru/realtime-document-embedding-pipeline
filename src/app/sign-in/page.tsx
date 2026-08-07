import { redirect } from "next/navigation";

import { signInWithGoogle, signOutCurrentUser } from "@/app/actions/auth";
import { auth } from "@/auth";
import { AuthControls } from "@/components/auth/auth-controls";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center p-8">
      <Card>
        <CardHeader>
          <CardTitle>Sign in to continue</CardTitle>
          <CardDescription>
            Use your Google account to upload documents and track their
            embedding progress.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthControls
            user={null}
            signInAction={signInWithGoogle}
            signOutAction={signOutCurrentUser}
          />
        </CardContent>
      </Card>
    </main>
  );
}

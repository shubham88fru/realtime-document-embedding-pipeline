import { ArrowDown, FileText, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { signInWithGoogle, signOutCurrentUser } from "@/app/actions/auth";
import { auth } from "@/auth";
import { AuthControls } from "@/components/auth/auth-controls";
import {
  CloudlineBackdrop,
  ProductMark,
} from "@/components/layout/app-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { serverEnv } from "@/lib/env";
import { formatMegabytes } from "@/lib/format";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  const { limits } = serverEnv();
  const maxFileSize = formatMegabytes(limits.maxFileSizeBytes);

  return (
    <main className="cloudline-canvas relative isolate min-h-svh overflow-hidden px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <CloudlineBackdrop />

      <div className="relative z-10 mx-auto grid min-h-[calc(100svh-2.5rem)] w-full max-w-7xl items-center gap-12 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
        <section className="max-w-2xl">
          <div className="mb-14 flex items-center gap-3 sm:mb-20">
            <ProductMark />
            <div>
              <p className="font-heading text-lg font-medium tracking-tight">
                Document Embedding Pipeline
              </p>
              <p className="text-xs text-muted-foreground">
                Private document workspace
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/65 px-3 py-2 text-xs font-semibold text-muted-foreground shadow-sm backdrop-blur-sm">
            <ShieldCheck aria-hidden="true" className="size-4 text-action" />
            Your documents stay scoped to your account
          </div>

          <h1 className="mt-7 max-w-xl text-4xl leading-[1.08] font-light tracking-[-0.035em] text-foreground sm:text-5xl lg:text-6xl">
            Turn PDFs into embeddings without losing track.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Sign in to keep every document, processing status, and progress
            update together in one protected workspace.
          </p>

          <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/55 px-4 py-3 text-sm text-foreground shadow-sm backdrop-blur-sm">
              <FileText aria-hidden="true" className="size-4 text-action" />
              PDF files up to {maxFileSize}
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/55 px-4 py-3 text-sm text-foreground shadow-sm backdrop-blur-sm">
              <ArrowDown aria-hidden="true" className="size-4 text-action" />
              Up to {limits.maxUploadFiles} files per upload
            </div>
          </div>
        </section>

        <Card className="mx-auto w-full max-w-md bg-card/82 p-2 sm:p-3">
          <CardHeader className="pb-2">
            <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-cloud text-action">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl">
              Welcome to your workspace
            </CardTitle>
            <CardDescription className="max-w-sm leading-6">
              Continue with Google to access documents tied only to your
              account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-2">
            <AuthControls
              user={null}
              signInAction={signInWithGoogle}
              signOutAction={signOutCurrentUser}
            />
            <p className="px-2 text-center text-xs leading-5 text-muted-foreground">
              Authentication is handled by Google. We store your verified
              profile only to identify your private workspace.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

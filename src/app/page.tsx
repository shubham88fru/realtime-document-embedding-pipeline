import { FileText, Gauge, LockKeyhole, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { signInWithGoogle, signOutCurrentUser } from "@/app/actions/auth";
import { auth } from "@/auth";
import { AuthControls } from "@/components/auth/auth-controls";
import { AppShell } from "@/components/layout/app-shell";
import { UploadDeck } from "@/components/uploads/upload-deck";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DocumentStatusPill } from "@/components/ui/document-status-pill";
import { serverEnv } from "@/lib/env";
import { formatMegabytes } from "@/lib/format";
import { DOCUMENT_STATUSES } from "@/types/document";

// Reports runtime configuration, so it must not be prerendered with the values
// that happened to be set at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in");
  }

  const { limits } = serverEnv();
  const maxFileSize = formatMegabytes(limits.maxFileSizeBytes);

  return (
    <AppShell
      status={
        <span className="inline-flex items-center gap-2">
          <ShieldCheck aria-hidden="true" className="size-4 text-action" />
          Protected workspace
        </span>
      }
      userControls={
        <AuthControls
          user={session.user}
          signInAction={signInWithGoogle}
          signOutAction={signOutCurrentUser}
        />
      }
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
        <section>
          <p className="text-xs font-semibold tracking-[0.18em] text-action uppercase">
            Your document workspace
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl leading-[1.08] font-light tracking-[-0.035em] text-foreground sm:text-5xl">
            A clear view of every PDF you process.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Add PDFs to private object storage. A document appears as uploaded
            only after storage and database persistence both succeed.
          </p>

          <div className="mt-10">
            <UploadDeck
              limits={{
                maxFiles: limits.maxUploadFiles,
                maxFileSizeBytes: limits.maxFileSizeBytes,
              }}
            />
          </div>
        </section>

        <aside className="space-y-5">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Workspace limits</CardTitle>
              <CardDescription>
                What you can add in one upload.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <FileText
                  aria-hidden="true"
                  className="mt-0.5 size-4 text-action"
                />
                <div>
                  <p className="font-medium">PDF documents</p>
                  <p className="text-muted-foreground">
                    Up to {maxFileSize} each
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Gauge
                  aria-hidden="true"
                  className="mt-0.5 size-4 text-action"
                />
                <div>
                  <p className="font-medium">
                    {limits.maxUploadFiles} files per upload
                  </p>
                  <p className="text-muted-foreground">
                    Choose up to {limits.maxUploadFiles} PDFs at once
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <LockKeyhole
                  aria-hidden="true"
                  className="mt-0.5 size-4 text-action"
                />
                <div>
                  <p className="font-medium">Private by account</p>
                  <p className="text-muted-foreground">
                    Only you can access your documents
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Stored statuses</CardTitle>
              <CardDescription>
                Every document stays in one clear state.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {DOCUMENT_STATUSES.map((status) => (
                <DocumentStatusPill key={status} status={status} />
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}

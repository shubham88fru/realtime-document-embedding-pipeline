import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { serverEnv } from "@/lib/env";
import { DOCUMENT_STATUSES } from "@/types/document";

const STATUS_STYLES: Record<(typeof DOCUMENT_STATUSES)[number], string> = {
  uploaded: "bg-status-uploaded text-status-uploaded-foreground",
  processing: "bg-status-processing text-status-processing-foreground",
  complete: "bg-status-complete text-status-complete-foreground",
  error: "bg-status-error text-status-error-foreground",
};

// Reports runtime configuration, so it must not be prerendered with the values
// that happened to be set at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in");
  }

  const { appEnv, limits } = serverEnv();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Document Embedding Pipeline
          </h1>
          <p className="text-muted-foreground">
            Upload documents and convert them into vector embeddings, with
            real-time progress.
          </p>
        </div>
        <AuthControls
          user={session.user}
          signInAction={signInWithGoogle}
          signOutAction={signOutCurrentUser}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Environment</CardTitle>
          <CardDescription>
            Configuration resolved at startup from <code>.env</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Deployment</span>
            <span className="font-mono">{appEnv}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Files per upload</span>
            <span className="font-mono">{limits.maxUploadFiles}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Max file size</span>
            <span className="font-mono">
              {limits.maxFileSizeBytes / (1024 * 1024)} MB
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Concurrent documents</span>
            <span className="font-mono">
              {limits.maxProcessingConcurrency}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline stages</CardTitle>
          <CardDescription>
            Upload and progress reporting arrive in later tickets.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {DOCUMENT_STATUSES.map((status) => (
            <Badge key={status} className={STATUS_STYLES[status]}>
              {status}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
import { redirect } from "next/navigation";

import { signInWithGoogle, signOutCurrentUser } from "@/app/actions/auth";
import { auth } from "@/auth";
import { AuthControls } from "@/components/auth/auth-controls";

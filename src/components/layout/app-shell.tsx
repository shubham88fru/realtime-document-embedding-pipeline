import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function ProductMark() {
  return (
    <span
      aria-hidden="true"
      className="relative flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-sm"
    >
      <span className="absolute size-4 -translate-x-1 -translate-y-1 rotate-6 rounded-[0.3rem] border border-primary-foreground/60" />
      <span className="absolute size-4 translate-x-1 translate-y-1 -rotate-6 rounded-[0.3rem] bg-primary-foreground/95" />
    </span>
  );
}

export function CloudlineBackdrop() {
  return (
    <>
      <div
        aria-hidden="true"
        className="cloudline-orb cloudline-orb-blue -right-40 -top-44"
      />
      <div
        aria-hidden="true"
        className="cloudline-orb cloudline-orb-blush -left-44 top-72"
      />
    </>
  );
}

type AppShellProps = {
  children: ReactNode;
  userControls: ReactNode;
  status?: ReactNode;
  className?: string;
};

export function AppShell({
  children,
  userControls,
  status,
  className,
}: AppShellProps) {
  return (
    <div className="cloudline-canvas relative isolate min-h-svh overflow-x-clip">
      <CloudlineBackdrop />

      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 w-full max-w-7xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            aria-label="Document Embedding Pipeline"
            className="group order-1 flex min-h-11 min-w-0 items-center gap-3 rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring"
            href="/"
          >
            <ProductMark />
            <span className="min-w-0">
              <span className="block whitespace-nowrap font-heading text-sm font-medium tracking-tight text-foreground sm:text-base lg:text-lg">
                Document Embedding Pipeline
              </span>
              <span className="hidden text-xs text-muted-foreground lg:block">
                Private document workspace
              </span>
            </span>
          </Link>

          {status ? (
            <div className="order-3 flex w-full items-center border-t border-border/60 pt-2 text-sm text-muted-foreground md:order-2 md:ml-auto md:w-auto md:border-0 md:pt-0">
              {status}
            </div>
          ) : null}
          <div className="order-2 ml-auto flex items-center gap-3 md:order-3 md:ml-0">
            {userControls}
          </div>
        </div>
      </header>

      <main
        className={cn(
          "relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16",
          className,
        )}
      >
        {children}
      </main>
    </div>
  );
}

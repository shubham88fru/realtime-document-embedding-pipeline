import type { ComponentType, ReactNode, SVGProps } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <section
      aria-label={title}
      className={cn(
        "flex min-h-72 flex-col items-center justify-center rounded-[2rem] border border-dashed border-border bg-card/70 px-6 py-12 text-center shadow-cloudline backdrop-blur-sm",
        className,
      )}
    >
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-cloud text-action shadow-sm">
        <Icon aria-hidden="true" className="size-6" />
      </div>
      <h2 className="font-heading text-2xl font-medium tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </section>
  );
}

export function LoadingState({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      className={cn(
        "space-y-3 rounded-[2rem] border border-border/80 bg-card/70 p-5 shadow-cloudline backdrop-blur-sm",
        className,
      )}
      role="status"
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: 3 }, (_, index) => (
        <div
          aria-hidden="true"
          className="flex items-center gap-4 rounded-2xl bg-cloud/70 p-4"
          key={index}
        >
          <div className="size-10 animate-pulse rounded-xl bg-action/10 motion-reduce:animate-none" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/5 animate-pulse rounded-full bg-action/15 motion-reduce:animate-none" />
            <div className="h-2 w-3/5 animate-pulse rounded-full bg-action/10 motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  );
}

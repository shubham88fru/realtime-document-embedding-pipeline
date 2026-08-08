import type { ComponentType, HTMLAttributes, SVGProps } from "react";
import {
  CircleCheck,
  Info,
  TriangleAlert,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NoticeVariant = "info" | "success" | "warning" | "error";

const NOTICE_PRESENTATION: Record<
  NoticeVariant,
  {
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    className: string;
  }
> = {
  info: {
    icon: Info,
    className: "border-action/20 bg-cloud text-foreground",
  },
  success: {
    icon: CircleCheck,
    className:
      "border-status-complete-foreground/20 bg-status-complete text-status-complete-foreground",
  },
  warning: {
    icon: TriangleAlert,
    className:
      "border-status-processing-foreground/20 bg-status-processing text-status-processing-foreground",
  },
  error: {
    icon: TriangleAlert,
    className:
      "border-status-error-foreground/20 bg-status-error text-status-error-foreground",
  },
};

type NoticeProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
  variant?: NoticeVariant;
};

export function Notice({
  title,
  description,
  variant = "info",
  className,
  children,
  ...props
}: NoticeProps) {
  const presentation = NOTICE_PRESENTATION[variant];
  const Icon = presentation.icon;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-2xl border px-4 py-3 text-sm",
        presentation.className,
        className,
      )}
      role={variant === "error" ? "alert" : "status"}
      {...props}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 space-y-1">
        <p className="font-semibold text-current">{title}</p>
        {description ? <p className="text-current">{description}</p> : null}
        {children}
      </div>
    </div>
  );
}

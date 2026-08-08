"use client";

import { cn } from "@/lib/utils";
import {
  Progress,
  ProgressLabel,
} from "@/components/ui/progress";

type PipelineProgressProps = {
  label: string;
  value?: number;
  className?: string;
};

export function PipelineProgress({
  label,
  value,
  className,
}: PipelineProgressProps) {
  const determinate = value !== undefined;

  return (
    <Progress
      aria-label={label}
      className={cn("gap-2", className)}
      value={determinate ? value : null}
    >
      <ProgressLabel>{label}</ProgressLabel>
      <span className="ml-auto font-mono text-sm text-muted-foreground tabular-nums">
        {determinate ? `${value}%` : "In progress"}
      </span>
    </Progress>
  );
}

import {
  CircleCheck,
  CircleDot,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { DocumentStatus } from "@/types/document";

const STATUS_PRESENTATION = {
  uploaded: {
    label: "Uploaded",
    icon: CircleDot,
    className: "bg-status-uploaded text-status-uploaded-foreground",
  },
  processing: {
    label: "Processing",
    icon: LoaderCircle,
    className: "bg-status-processing text-status-processing-foreground",
  },
  complete: {
    label: "Complete",
    icon: CircleCheck,
    className: "bg-status-complete text-status-complete-foreground",
  },
  error: {
    label: "Error",
    icon: TriangleAlert,
    className: "bg-status-error text-status-error-foreground",
  },
} satisfies Record<
  DocumentStatus,
  {
    label: string;
    icon: typeof CircleDot;
    className: string;
  }
>;

export function DocumentStatusPill({ status }: { status: DocumentStatus }) {
  const presentation = STATUS_PRESENTATION[status];
  const Icon = presentation.icon;

  return (
    <Badge className={presentation.className}>
      <Icon aria-hidden="true" data-icon="inline-start" />
      {presentation.label}
    </Badge>
  );
}

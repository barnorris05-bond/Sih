import { STATE_META, type ApplicationState } from "@aicte/shared";
import { Badge } from "@/components/ui/badge";
import { STATE_STYLES } from "@/lib/format";
import { cn } from "@/lib/utils";

const VARIANT: Record<ApplicationState, "neutral" | "info" | "indigo" | "success" | "warning" | "danger" | "violet"> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  RULE_VALIDATION_FAILED: "danger",
  UNDER_SCRUTINY: "indigo",
  DEFICIENCY_NOTIFIED: "warning",
  EVC_INSPECTION: "violet",
  APPROVED: "success",
  REJECTED: "danger",
};

export function StateBadge({
  state,
  className,
  dot = true,
}: {
  state: ApplicationState;
  className?: string;
  dot?: boolean;
}) {
  return (
    <Badge variant={VARIANT[state]} dot={dot} className={cn(STATE_STYLES[state], className)}>
      {STATE_META[state].label}
    </Badge>
  );
}

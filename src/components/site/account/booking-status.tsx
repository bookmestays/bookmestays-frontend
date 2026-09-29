import { Badge } from "@/components/ui";
import type { BookingStatus } from "@/lib/types";

const MAP: Record<BookingStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info" }> = {
  PENDING_PAYMENT: { label: "Payment pending", tone: "warning" },
  CONFIRMED: { label: "Confirmed", tone: "success" },
  CHECKED_IN: { label: "Checked in", tone: "info" },
  COMPLETED: { label: "Completed", tone: "neutral" },
  CANCELLED: { label: "Cancelled", tone: "danger" },
  NO_SHOW: { label: "No-show", tone: "danger" },
  EXPIRED: { label: "Expired", tone: "neutral" },
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const s = MAP[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

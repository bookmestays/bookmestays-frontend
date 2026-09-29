"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { LogIn, LogOut, UserX } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import type { BookingDetail } from "@/lib/types";
import { Button, useToast } from "@/components/ui";
import { LoadState, PageHeader } from "@/components/panel/page";
import { StatusBadge } from "@/components/panel/status-badge";
import { ConfirmDialog } from "@/components/panel/confirm-dialog";
import { BookingOverview, stayLabel } from "@/components/panel/booking-parts";
import { todayISO } from "@/components/panel/util";
import { RequirePermission } from "../../../_components/require";

type Action = "check-in" | "check-out" | "no-show";
const COPY: Record<Action, { title: string; label: string; description: string; tone: "primary" | "danger" }> = {
  "check-in": { title: "Check in guest?", label: "Check in", description: "Mark the guest as arrived.", tone: "primary" },
  "check-out": { title: "Check out guest?", label: "Check out", description: "Mark the stay as finished. It becomes payable on your settlement schedule.", tone: "primary" },
  "no-show": { title: "Mark as no-show?", label: "Mark no-show", description: "Use only if the guest didn't arrive. BookMeStays support may contact you to confirm.", tone: "danger" },
};

export default function PartnerBookingPage() {
  return (
    <RequirePermission perm="bookings">
      <Detail />
    </RequirePermission>
  );
}

function Detail() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [today] = useState(todayISO);
  const { data, error, loading, refetch, mutate } = useApi<BookingDetail>(`/partner/bookings/${id}`);
  const [action, setAction] = useState<Action | null>(null);
  const b = data?.id === id ? data : undefined;
  const arrived = b && b.checkIn <= today;

  return (
    <LoadState loading={loading && !b} error={b ? null : error} onRetry={refetch}>
      {b && (
        <>
          <PageHeader
            title={<span className="font-mono">{b.code}</span>}
            meta={<StatusBadge kind="booking" status={b.status} />}
            breadcrumbs={[{ label: "Bookings", href: "/partner/bookings" }, { label: b.code }]}
            description={`${b.guestName} · ${stayLabel(b)} · ${b.roomsLabel}`}
            actions={
              <>
                {b.status === "CONFIRMED" && arrived && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setAction("no-show")}>
                      <UserX className="size-4" /> No-show
                    </Button>
                    <Button size="sm" onClick={() => setAction("check-in")}>
                      <LogIn className="size-4" /> Check in
                    </Button>
                  </>
                )}
                {b.status === "CHECKED_IN" && (
                  <Button size="sm" onClick={() => setAction("check-out")}>
                    <LogOut className="size-4" /> Check out
                  </Button>
                )}
              </>
            }
          />
          <BookingOverview b={b} />
          <ConfirmDialog
            open={!!action}
            onClose={() => setAction(null)}
            title={action ? COPY[action].title : ""}
            description={action ? COPY[action].description : undefined}
            confirmLabel={action ? COPY[action].label : ""}
            tone={action ? COPY[action].tone : "primary"}
            onConfirm={async () => {
              const next = await api<BookingDetail | { ok: boolean }>(`/partner/bookings/${b.id}/${action}`, { method: "POST" });
              if (next && "id" in next) mutate(() => next);
              else refetch();
              toast.success("Booking updated");
            }}
          />
        </>
      )}
    </LoadState>
  );
}

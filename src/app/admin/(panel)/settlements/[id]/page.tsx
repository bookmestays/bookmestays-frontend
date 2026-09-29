"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Banknote, CheckCircle2, PauseCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { formatDate } from "@/lib/format";
import type { SettlementDetail } from "@/lib/types";
import { Button, Field, Input, useToast } from "@/components/ui";
import { KeyValue, LoadState, PageHeader, Section } from "@/components/panel/page";
import { StatusBadge } from "@/components/panel/status-badge";
import { ConfirmDialog } from "@/components/panel/confirm-dialog";
import { DataTable } from "@/components/panel/data-table";
import { bookingColumns, LedgerTable } from "@/components/panel/booking-parts";
import { SettlementBreakdown } from "@/components/panel/settlement-parts";
import { formatDateTime } from "@/components/panel/labels";
import { formatINR } from "@/lib/format";

type Action = "approve" | "hold" | "paid";

export default function AdminSettlementPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { data, error, loading, refetch, mutate } = useApi<SettlementDetail>(`/admin/settlements/${id}`);
  const [action, setAction] = useState<Action | null>(null);
  const [utr, setUtr] = useState("");
  const s = data?.id === id ? data : undefined;
  const open = s && (s.status === "PENDING" || s.status === "ON_HOLD" || s.status === "FAILED");

  const done = (next: SettlementDetail | unknown, msg: string) => {
    if (next && typeof next === "object" && "id" in next) mutate(() => ({ ...s!, ...(next as SettlementDetail) }));
    refetch();
    toast.success(msg);
  };

  return (
    <LoadState loading={loading && !s} error={s ? null : error} onRetry={refetch}>
      {s && (
        <>
          <PageHeader
            title={`${s.partnerName} · ${formatDate(s.periodStart, { day: "numeric", month: "short" })} – ${formatDate(s.periodEnd)}`}
            meta={<StatusBadge kind="settlement" status={s.status} />}
            breadcrumbs={[{ label: "Settlements", href: "/admin/settlements" }, { label: formatDate(s.scheduledFor) }]}
            actions={
              open && (
                <>
                  {s.status !== "ON_HOLD" && (
                    <Button variant="outline" size="sm" onClick={() => setAction("hold")}>
                      <PauseCircle className="size-4" /> Hold
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setAction("paid")}>
                    <Banknote className="size-4" /> Mark paid (UTR)
                  </Button>
                  <Button size="sm" onClick={() => setAction("approve")}>
                    <CheckCircle2 className="size-4" /> Approve & pay
                  </Button>
                </>
              )
            }
          />
          <div className="grid gap-4 lg:grid-cols-3">
            <Section title="Payout breakdown" className="lg:col-span-2">
              <SettlementBreakdown s={s} />
            </Section>
            <Section title="Details">
              <KeyValue
                cols={1}
                items={[
                  { label: "Partner", value: <Link href={`/admin/partners/${s.partnerId}`} className="text-brand hover:underline">{s.partnerName}</Link> },
                  { label: "Scheduled for", value: formatDate(s.scheduledFor) },
                  { label: "Method", value: s.method ?? "—" },
                  { label: "UTR / reference", value: s.utr ? <span className="font-mono">{s.utr}</span> : "—" },
                  { label: "Paid at", value: formatDateTime(s.paidAt) },
                  { label: "Created", value: formatDateTime(s.createdAt) },
                ]}
              />
            </Section>
          </div>
          <h2 className="mt-6 mb-2 text-base font-semibold text-ink">Bookings ({s.bookings.length})</h2>
          <DataTable columns={bookingColumns({ showProperty: true })} rows={s.bookings} rowKey={(b) => b.id} rowHref={(b) => `/admin/bookings/${b.id}`} dense empty={{ title: "No bookings — adjustments only" }} />
          <h2 className="mt-6 mb-2 text-base font-semibold text-ink">Ledger lines</h2>
          <LedgerTable rows={s.ledger} />

          <ConfirmDialog
            open={action === "approve"}
            onClose={() => setAction(null)}
            title="Approve settlement?"
            description={`Releases ${formatINR(s.netPayable)} to ${s.partnerName} via Razorpay Route transfers (or a RazorpayX payout).`}
            confirmLabel="Approve & pay"
            onConfirm={async () => done(await api(`/admin/settlements/${s.id}/approve`, { method: "POST" }), "Settlement approved")}
          />
          <ConfirmDialog
            open={action === "hold"}
            onClose={() => setAction(null)}
            title="Put settlement on hold?"
            confirmLabel="Hold"
            tone="danger"
            notes={{ label: "Reason", required: true, placeholder: "e.g. Guest dispute on BMS7K2Q9XA" }}
            onConfirm={async (reason) => done(await api(`/admin/settlements/${s.id}/hold`, { method: "POST", body: { reason } }), "Settlement on hold")}
          />
          <ConfirmDialog
            open={action === "paid"}
            onClose={() => {
              setAction(null);
              setUtr("");
            }}
            title="Mark as paid manually"
            description={`Use this when ${formatINR(s.netPayable)} was sent by bank transfer outside Razorpay.`}
            confirmLabel="Mark paid"
            onConfirm={async () => {
              if (utr.trim().length < 6) throw new Error("Enter the bank UTR / reference number");
              done(await api(`/admin/settlements/${s.id}/mark-paid`, { method: "POST", body: { utr: utr.trim() } }), "Marked as paid");
              setUtr("");
            }}
          >
            <Field label="UTR / bank reference" required>
              <Input value={utr} onChange={(e) => setUtr(e.target.value.toUpperCase())} className="font-mono" autoFocus />
            </Field>
          </ConfirmDialog>
        </>
      )}
    </LoadState>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { CalendarClock, RotateCcw, XCircle } from "lucide-react";
import { ModifyBookingForm } from "@/components/booking/modify-booking-form";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { formatINR } from "@/lib/format";
import type { AdminBookingDetail } from "@/lib/panel-types";
import { Badge, Button, Checkbox, Field, Modal, Textarea, useToast } from "@/components/ui";
import { LoadState, PageHeader, Section } from "@/components/panel/page";
import { StatusBadge } from "@/components/panel/status-badge";
import { BookingOverview, LedgerTable, stayLabel } from "@/components/panel/booking-parts";
import { ChannelLogsTable } from "@/components/panel/channel-logs";
import { DataTable } from "@/components/panel/data-table";
import { MoneyInput } from "@/components/panel/inputs";
import { formatDateTime, humanize } from "@/components/panel/labels";
import { errorMessage } from "@/lib/use-api";

export default function AdminBookingPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, loading, refetch, mutate } = useApi<AdminBookingDetail>(`/admin/bookings/${id}`);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [modifyOpen, setModifyOpen] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  const toast = useToast();
  const b = data?.id === id ? data : undefined;
  const cancellable = b && ["CONFIRMED", "CHECKED_IN", "PENDING_PAYMENT"].includes(b.status);

  return (
    <LoadState loading={loading && !b} error={b ? null : error} onRetry={refetch}>
      {b && (
        <>
          <PageHeader
            title={<span className="font-mono">{b.code}</span>}
            meta={<StatusBadge kind="booking" status={b.status} />}
            breadcrumbs={[{ label: "Bookings", href: "/admin/bookings" }, { label: b.code }]}
            description={
              <>
                {b.guestName} · {b.property.name} · {stayLabel(b)}
                {b.partnerId && (
                  <>
                    {" · "}
                    <Link href={`/admin/partners/${b.partnerId}`} className="text-brand hover:underline">
                      {b.partnerName ?? "Partner"}
                    </Link>
                  </>
                )}
              </>
            }
            actions={
              <>
                {b.status === "CONFIRMED" && (
                  <Button variant="outline" size="sm" onClick={() => setModifyOpen(true)}>
                    <CalendarClock className="size-4" /> Modify booking
                  </Button>
                )}
                {cancellable && (
                  <Button variant="danger" size="sm" onClick={() => setCancelOpen(true)}>
                    <XCircle className="size-4" /> Cancel booking
                  </Button>
                )}
              </>
            }
          />
          <BookingOverview
            b={b}
            extra={
              <>
                <Section title="Payments" bodyClassName="p-0 sm:p-0">
                  <DataTable
                    className="rounded-none border-0"
                    dense
                    rows={b.payments ?? []}
                    rowKey={(p) => p.id}
                    columns={[
                      { key: "date", header: "Date", cell: (p) => formatDateTime(p.createdAt) },
                      { key: "id", header: "Razorpay", cell: (p) => <span className="font-mono text-xs">{p.providerPaymentId ?? p.providerOrderId ?? "—"}</span> },
                      { key: "method", header: "Method", cell: (p) => p.method ?? "—", hideBelow: "sm" },
                      { key: "amount", header: "Amount", cell: (p) => formatINR(p.amount, { decimals: true }), align: "right" },
                      { key: "status", header: "Status", cell: (p) => <Badge tone={p.status === "CAPTURED" ? "success" : p.status === "FAILED" ? "danger" : "neutral"}>{humanize(p.status)}</Badge> },
                    ]}
                    empty={{ title: "No payments" }}
                  />
                </Section>
                {(b.refunds?.length ?? 0) > 0 && (
                  <Section title="Refunds" bodyClassName="p-0 sm:p-0">
                    <DataTable
                      className="rounded-none border-0"
                      dense
                      rows={b.refunds}
                      rowKey={(r) => r.id}
                      columns={[
                        { key: "date", header: "Date", cell: (r) => formatDateTime(r.createdAt) },
                        { key: "id", header: "Refund ID", cell: (r) => <span className="font-mono text-xs">{r.providerRefundId ?? "—"}</span> },
                        { key: "reason", header: "Reason", cell: (r) => r.reason ?? "—", hideBelow: "sm" },
                        { key: "amount", header: "Amount", cell: (r) => formatINR(r.amount, { decimals: true }), align: "right" },
                        { key: "status", header: "Status", cell: (r) => <Badge tone={r.status === "PROCESSED" ? "success" : r.status === "FAILED" ? "danger" : "warning"}>{humanize(r.status)}</Badge> },
                        {
                          key: "retry",
                          header: <span className="sr-only">Actions</span>,
                          align: "right",
                          cell: (r) =>
                            r.status === "FAILED" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                loading={retrying === r.id}
                                onClick={async () => {
                                  setRetrying(r.id);
                                  try {
                                    const res = await api<{ status: string }>(`/admin/refunds/${r.id}/retry`, { method: "POST" });
                                    if (res.status === "FAILED") toast.error("Razorpay rejected the refund again — check the payment in the Razorpay dashboard");
                                    else toast.success("Refund sent to Razorpay");
                                    refetch();
                                  } catch (err) {
                                    toast.error(errorMessage(err));
                                  } finally {
                                    setRetrying(null);
                                  }
                                }}
                              >
                                <RotateCcw className="size-4" /> Retry
                              </Button>
                            ) : null,
                        },
                      ]}
                    />
                  </Section>
                )}
                <div>
                  <h2 className="mb-2 text-base font-semibold text-ink">Partner ledger</h2>
                  <LedgerTable rows={b.ledger ?? []} />
                </div>
                <div>
                  <h2 className="mb-2 text-base font-semibold text-ink">Channel manager sync</h2>
                  <ChannelLogsTable data={b.channelLogs ?? []} onRetry={(l) => api(`/admin/channel/logs/${l.id}/retry`, { method: "POST" })} refetch={refetch} />
                </div>
              </>
            }
          />
          <Modal open={modifyOpen} onClose={() => setModifyOpen(false)} title={`Modify ${b.code}`} size="lg">
            {modifyOpen && (
              <ModifyBookingForm
                booking={b}
                mode={{ kind: "admin", bookingId: b.id }}
                onDone={() => refetch()}
                onCancel={() => setModifyOpen(false)}
              />
            )}
          </Modal>
          <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel booking">
            {cancelOpen && (
              <CancelForm
                booking={b}
                onClose={() => setCancelOpen(false)}
                onDone={(next) => {
                  mutate(() => ({ ...b, ...next }));
                  refetch();
                }}
              />
            )}
          </Modal>
        </>
      )}
    </LoadState>
  );
}

function CancelForm({ booking, onClose, onDone }: { booking: AdminBookingDetail; onClose: () => void; onDone: (b: AdminBookingDetail) => void }) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [override, setOverride] = useState(false);
  const [refund, setRefund] = useState<number | null>(booking.totalAmount);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const errs = {
    reason: reason.trim().length < 3 ? "Give a reason (shared with guest and hotel)" : null,
    refund: override && (refund == null || refund < 0 || refund > booking.totalAmount) ? `Between ₹0 and ${formatINR(booking.totalAmount)}` : null,
  };
  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setTouched(true);
        if (errs.reason || errs.refund) return;
        setBusy(true);
        try {
          const next = await api<AdminBookingDetail>(`/admin/bookings/${booking.id}/cancel`, { method: "POST", body: { reason: reason.trim(), ...(override ? { refundAmount: refund ?? 0 } : {}) } });
          toast.success("Booking cancelled");
          onDone(next);
          onClose();
        } catch (err) {
          toast.error(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="text-sm text-ink-2">
        Inventory is released, the guest is refunded via Razorpay and the channel manager is notified. By default the refund follows the booking&apos;s cancellation policy (total paid {formatINR(booking.totalAmount)}).
      </p>
      <Field label="Reason" required error={touched ? errs.reason : null}>
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <Checkbox label="Override policy refund amount" checked={override} onChange={(e) => setOverride(e.target.checked)} />
      {override && (
        <Field label="Refund amount" error={touched ? errs.refund : null}>
          <MoneyInput value={refund} onChange={setRefund} />
        </Field>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Keep booking
        </Button>
        <Button type="submit" variant="danger" loading={busy}>
          Cancel booking
        </Button>
      </div>
    </form>
  );
}

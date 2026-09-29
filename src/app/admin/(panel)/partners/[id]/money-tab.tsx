"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/use-api";
import { formatINR } from "@/lib/format";
import type { Paginated, PartnerDetail, Settlement } from "@/lib/types";
import { Button, Field, Input, useToast } from "@/components/ui";
import { DataTable } from "@/components/panel/data-table";
import { MoneyInput } from "@/components/panel/inputs";
import { Section } from "@/components/panel/page";
import { LedgerTable } from "@/components/panel/booking-parts";
import type { LedgerPage } from "@/lib/panel-types";
import { settlementColumns } from "@/components/panel/settlement-parts";
import { settlementScheduleLabel } from "@/components/panel/labels";

export function MoneyTab({ partner }: { partner: PartnerDetail }) {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const settlements = useApi<Paginated<Settlement>>("/admin/settlements", { partnerId: partner.id, page, limit: 10 });
  const [ledgerPage, setLedgerPage] = useState(1);
  const ledger = useApi<LedgerPage>(`/admin/partners/${partner.id}/ledger`, { page: ledgerPage, limit: 20 });
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const errs = { amount: !amount ? "Enter an amount" : null, description: description.trim().length < 3 ? "Describe the adjustment" : null };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-2 lg:col-span-2">
        <h2 className="text-base font-semibold text-ink">Settlements</h2>
        <p className="text-sm text-muted">Schedule: {settlementScheduleLabel(partner)}</p>
        <DataTable
          columns={settlementColumns()}
          rows={settlements.data?.items}
          rowKey={(s) => s.id}
          loading={settlements.loading}
          error={settlements.error}
          onRetry={settlements.refetch}
          rowHref={(s) => `/admin/settlements/${s.id}`}
          pagination={settlements.data ? { page: settlements.data.page, totalPages: settlements.data.totalPages, total: settlements.data.total, limit: settlements.data.limit, onPageChange: setPage } : undefined}
          dense
          empty={{ title: "No settlements yet" }}
        />
        <div className="flex flex-wrap items-baseline justify-between gap-2 pt-4">
          <h2 className="text-base font-semibold text-ink">Ledger</h2>
          <p className="text-sm text-muted">
            Balance{" "}
            <span className={`text-base font-semibold tabular-nums ${ledger.data && ledger.data.balance < 0 ? "text-danger" : "text-ink"}`}>
              {ledger.data ? formatINR(ledger.data.balance, { decimals: true }) : "—"}
            </span>{" "}
            · {ledger.data && ledger.data.balance < 0 ? "partner owes BookMeStays" : "owed to the partner, not yet settled"}
          </p>
        </div>
        <LedgerTable
          rows={ledger.data?.items}
          loading={ledger.loading}
          error={ledger.error}
          onRetry={ledger.refetch}
          pagination={ledger.data ? { page: ledger.data.page, totalPages: ledger.data.totalPages, total: ledger.data.total, limit: ledger.data.limit, onPageChange: setLedgerPage } : undefined}
        />
      </div>
      <Section title="Ledger adjustment" description="Credit or debit the partner's balance. It's included in their next settlement.">
        <form
          className="space-y-4"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            setTouched(true);
            if (errs.amount || errs.description || !amount) return;
            setBusy(true);
            try {
              await api(`/admin/partners/${partner.id}/adjustments`, {
                method: "POST",
                body: { amount: direction === "credit" ? amount : -amount, description: description.trim() },
              });
              toast.success(`${direction === "credit" ? "Credit" : "Debit"} of ${formatINR(amount)} recorded`);
              ledger.refetch();
              setAmount(null);
              setDescription("");
              setTouched(false);
            } catch (err) {
              toast.error(errorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset className="flex gap-2">
            <legend className="sr-only">Direction</legend>
            {(["credit", "debit"] as const).map((d) => (
              <label key={d} className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm ${direction === d ? (d === "credit" ? "border-success bg-success/5" : "border-danger bg-danger/5") : "border-line"}`}>
                <input type="radio" className="sr-only" name="dir" checked={direction === d} onChange={() => setDirection(d)} />
                {d === "credit" ? "Credit partner (+)" : "Debit partner (−)"}
              </label>
            ))}
          </fieldset>
          <Field label="Amount" required error={touched ? errs.amount : null}>
            <MoneyInput value={amount} onChange={setAmount} aria-invalid={touched && !!errs.amount} />
          </Field>
          <Field label="Description" required error={touched ? errs.description : null} hint="Visible to the partner in their ledger">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Compensation for overbooking BMS7K2Q9XA" />
          </Field>
          <Button type="submit" loading={busy} className="w-full">
            Record adjustment
          </Button>
        </form>
      </Section>
    </div>
  );
}

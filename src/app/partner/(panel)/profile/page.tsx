"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage, fieldErrors, useApi } from "@/lib/use-api";
import type { PartnerProfile } from "@/lib/types";
import { Button, Field, Input, Textarea, useToast } from "@/components/ui";
import { Alert, KeyValue, LoadState, PageHeader, SaveBar, Section } from "@/components/panel/page";
import { StatusBadge } from "@/components/panel/status-badge";
import { PolicySummary } from "@/components/panel/cancellation-policy-editor";
import { commissionLabel, settlementScheduleLabel } from "@/components/panel/labels";
import { sameJson, useUnsavedChanges } from "@/components/panel/unsaved";
import { usePanelAuth } from "@/components/panel/auth";
import { GSTIN_RE, IFSC_RE, PAN_RE, PHONE_RE, nullIfEmpty } from "@/components/panel/util";
import { formatDate } from "@/lib/format";

type Form = { contactName: string; phone: string; address: string; gstin: string; pan: string; bankAccountName: string; bankAccountNumber: string; bankAccountNumberConfirm: string; bankIfsc: string };

const fromProfile = (p: PartnerProfile): Form => ({
  contactName: p.contactName,
  phone: p.phone,
  address: p.address ?? "",
  gstin: p.gstin ?? "",
  pan: p.pan ?? "",
  bankAccountName: p.bankAccountName ?? "",
  bankAccountNumber: "",
  bankAccountNumberConfirm: "",
  bankIfsc: p.bankIfsc ?? "",
});

export default function PartnerProfilePage() {
  const { data, error, loading, refetch } = useApi<PartnerProfile>("/partner/me");
  return (
    <LoadState loading={loading && !data} error={data ? null : error} onRetry={refetch}>
      {data && <Profile key={data.id} profile={data} onSaved={refetch} />}
    </LoadState>
  );
}

function Profile({ profile: p, onSaved }: { profile: PartnerProfile; onSaved: () => void }) {
  const toast = useToast();
  const { isOwner } = usePanelAuth();
  const [initial, setInitial] = useState(() => fromProfile(p));
  const [f, setF] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const dirty = !sameJson(f, initial);
  useUnsavedChanges(dirty);
  const set = (patch: Partial<Form>) => setF((x) => ({ ...x, ...patch }));
  const bankChanging = !!f.bankAccountNumber || f.bankIfsc !== initial.bankIfsc || f.bankAccountName !== initial.bankAccountName;

  const validate = () => {
    const e: Record<string, string> = {};
    if (f.contactName.trim().length < 2) e.contactName = "Required";
    if (!PHONE_RE.test(f.phone.trim())) e.phone = "Enter a valid phone";
    if (f.gstin && !GSTIN_RE.test(f.gstin)) e.gstin = "15-character GSTIN";
    if (f.pan && !PAN_RE.test(f.pan)) e.pan = "Format ABCDE1234F";
    if (f.bankIfsc && !IFSC_RE.test(f.bankIfsc)) e.bankIfsc = "Format HDFC0001234";
    if (f.bankAccountNumber && !/^\d{6,20}$/.test(f.bankAccountNumber)) e.bankAccountNumber = "6–20 digits";
    if (f.bankAccountNumber !== f.bankAccountNumberConfirm) e.bankAccountNumberConfirm = "Account numbers don't match";
    return e;
  };

  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const errs = validate();
        setErrors(errs);
        if (Object.keys(errs).length) return toast.error("Please fix the highlighted fields.");
        setBusy(true);
        try {
          await api("/partner/me", {
            method: "PATCH",
            body: {
              contactName: f.contactName.trim(),
              phone: f.phone.trim().replace(/[\s-]/g, ""),
              address: nullIfEmpty(f.address),
              gstin: nullIfEmpty(f.gstin),
              pan: nullIfEmpty(f.pan),
              bankAccountName: nullIfEmpty(f.bankAccountName),
              ...(f.bankAccountNumber ? { bankAccountNumber: f.bankAccountNumber } : {}),
              bankIfsc: nullIfEmpty(f.bankIfsc),
            },
          });
          const next = { ...f, bankAccountNumber: "", bankAccountNumberConfirm: "" };
          setInitial(next);
          setF(next);
          toast.success(bankChanging ? "Saved — bank details sent for verification" : "Profile saved");
          onSaved();
        } catch (err) {
          setErrors(fieldErrors(err));
          toast.error(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
      className="space-y-4"
    >
      <PageHeader title="Business profile" description={`${p.legalName} · partner since ${formatDate(p.createdAt)}`} meta={<StatusBadge kind="kyc" status={p.kycStatus} />} />
      {p.kycStatus === "REJECTED" && p.kycNotes && (
        <Alert tone="danger" title="KYC needs attention">
          {p.kycNotes}
        </Alert>
      )}
      <Section title="Commercial terms" description="Set by BookMeStays. Contact your account manager to change them." actions={<Lock className="size-4 text-muted" aria-label="Read-only" />}>
        <KeyValue
          cols={3}
          items={[
            { label: "Default commission", value: `${commissionLabel(p.defaultCommissionType, p.defaultCommissionValue)} + GST` },
            { label: "Settlement schedule", value: settlementScheduleLabel(p) },
            { label: "Display name", value: p.displayName },
          ]}
        />
        {p.commissionRules.length > 0 && (
          <div className="mt-4">
            <p className="mb-1 text-xs text-muted">Specific commission rates</p>
            <ul className="space-y-1 text-sm">
              {p.commissionRules.map((r) => (
                <li key={r.id} className="flex justify-between gap-2 rounded bg-surface-2 px-3 py-1.5">
                  <span>{[r.propertyName, r.roomTypeName].filter(Boolean).join(" · ") || "All properties"}</span>
                  <span className="font-medium">{commissionLabel(r.type, r.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs text-muted">Default cancellation policy</p>
            <PolicySummary policy={p.defaultCancellationPolicy} />
          </div>
          {p.defaultTerms && (
            <div>
              <p className="mb-1 text-xs text-muted">Default terms</p>
              <p className="line-clamp-4 text-sm whitespace-pre-line text-ink-2">{p.defaultTerms}</p>
            </div>
          )}
        </div>
      </Section>
      <fieldset disabled={!isOwner} className="space-y-4">
        {!isOwner && <Alert>Only the account owner can edit business details.</Alert>}
        <Section title="Contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact person" required error={errors.contactName}>
              <Input value={f.contactName} onChange={(e) => set({ contactName: e.target.value })} />
            </Field>
            <Field label="Email" hint="Contact BookMeStays to change your login email">
              <Input value={p.email} disabled />
            </Field>
            <Field label="Phone" required error={errors.phone}>
              <Input type="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <Textarea rows={2} value={f.address} onChange={(e) => set({ address: e.target.value })} />
            </Field>
          </div>
        </Section>
        <Section title="Tax details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="GSTIN" error={errors.gstin}>
              <Input value={f.gstin} maxLength={15} className="font-mono uppercase" onChange={(e) => set({ gstin: e.target.value.toUpperCase() })} />
            </Field>
            <Field label="PAN" error={errors.pan}>
              <Input value={f.pan} maxLength={10} className="font-mono uppercase" onChange={(e) => set({ pan: e.target.value.toUpperCase() })} />
            </Field>
          </div>
        </Section>
        <Section title="Bank account" description="Payouts are sent here. Changing bank details requires re-verification (KYC).">
          <div className="grid gap-4 sm:grid-cols-2">
            <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm sm:col-span-2">
              {p.bankAccountLast4 ? (
                <>
                  Current account: <strong>•••• {p.bankAccountLast4}</strong> · {p.bankIfsc} · <StatusBadge kind="kyc" status={p.kycStatus} />
                </>
              ) : (
                "No bank account on file yet."
              )}
            </p>
            <Field label="Account holder name">
              <Input value={f.bankAccountName} onChange={(e) => set({ bankAccountName: e.target.value })} />
            </Field>
            <Field label="IFSC" error={errors.bankIfsc}>
              <Input value={f.bankIfsc} maxLength={11} className="font-mono uppercase" onChange={(e) => set({ bankIfsc: e.target.value.toUpperCase() })} />
            </Field>
            <Field label={p.bankAccountLast4 ? "New account number" : "Account number"} error={errors.bankAccountNumber}>
              <Input inputMode="numeric" autoComplete="off" className="font-mono" value={f.bankAccountNumber} onChange={(e) => set({ bankAccountNumber: e.target.value.replace(/\D/g, "") })} />
            </Field>
            <Field label="Confirm account number" error={errors.bankAccountNumberConfirm}>
              <Input inputMode="numeric" autoComplete="off" className="font-mono" value={f.bankAccountNumberConfirm} onPaste={(e) => e.preventDefault()} onChange={(e) => set({ bankAccountNumberConfirm: e.target.value.replace(/\D/g, "") })} />
            </Field>
          </div>
        </Section>
      </fieldset>
      {isOwner && (
        <SaveBar dirty={dirty} message={dirty && bankChanging ? "Bank changes will be re-verified before your next payout" : undefined}>
          <Button variant="outline" disabled={!dirty} onClick={() => setF(initial)}>
            Discard
          </Button>
          <Button type="submit" loading={busy} disabled={!dirty}>
            Save profile
          </Button>
        </SaveBar>
      )}
    </form>
  );
}

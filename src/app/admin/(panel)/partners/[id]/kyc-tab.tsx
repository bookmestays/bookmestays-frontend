"use client";

import { useState } from "react";
import { BadgeCheck, Eye, Link2, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { KycStatus, PartnerDetail } from "@/lib/types";
import { Button, useToast } from "@/components/ui";
import { ConfirmDialog } from "@/components/panel/confirm-dialog";
import { Alert, CopyButton, KeyValue, Section } from "@/components/panel/page";
import { StatusBadge } from "@/components/panel/status-badge";

export function KycTab({ partner, onUpdated }: { partner: PartnerDetail; onUpdated: (p: PartnerDetail) => void }) {
  const toast = useToast();
  const [action, setAction] = useState<KycStatus | null>(null);
  const [linking, setLinking] = useState(false);
  const [activating, setActivating] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [bank, setBank] = useState<{ accountName: string | null; accountNumber: string; ifsc: string | null } | null>(null);
  const payoutsActive = !!partner.payoutsActivatedAt;
  const missing = [
    !partner.pan && "PAN",
    !partner.bankAccountLast4 && "bank account",
    !partner.bankIfsc && "IFSC",
  ].filter(Boolean) as string[];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="KYC" actions={<StatusBadge kind="kyc" status={partner.kycStatus} />}>
        <KeyValue
          items={[
            { label: "Legal name", value: partner.legalName },
            { label: "GSTIN", value: partner.gstin ? <span className="font-mono">{partner.gstin}</span> : "—" },
            { label: "PAN", value: partner.pan ? <span className="font-mono">{partner.pan}</span> : "—" },
            { label: "Bank account holder", value: partner.bankAccountName },
            { label: "Account number", value: partner.bankAccountLast4 ? `•••• ${partner.bankAccountLast4}` : "—" },
            { label: "IFSC", value: partner.bankIfsc ? <span className="font-mono">{partner.bankIfsc}</span> : "—" },
          ]}
        />
        {partner.bankAccountLast4 && (
          <div className="mt-4 rounded-lg border border-line p-3">
            {bank ? (
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <dt className="text-xs text-muted">Account number</dt>
                    <dd className="font-mono text-base font-semibold tracking-wide">{bank.accountNumber}</dd>
                  </div>
                  <CopyButton value={bank.accountNumber} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <dt className="text-xs text-muted">IFSC</dt>
                    <dd className="font-mono">{bank.ifsc}</dd>
                  </div>
                  {bank.ifsc && <CopyButton value={bank.ifsc} />}
                </div>
                <div>
                  <dt className="text-xs text-muted">Account holder</dt>
                  <dd>{bank.accountName ?? "—"}</dd>
                </div>
              </dl>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-ink-2">Full account number is hidden. Reveal it to make a manual bank transfer.</p>
                <Button
                  size="sm"
                  variant="outline"
                  loading={revealing}
                  onClick={async () => {
                    setRevealing(true);
                    try {
                      setBank(await api<NonNullable<typeof bank>>(`/admin/partners/${partner.id}/bank-account`));
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Could not load bank details");
                    } finally {
                      setRevealing(false);
                    }
                  }}
                >
                  <Eye className="size-4" /> Reveal account number
                </Button>
              </div>
            )}
          </div>
        )}
        {partner.kycNotes && (
          <Alert tone={partner.kycStatus === "REJECTED" ? "danger" : "info"} title="Notes" className="mt-4">
            {partner.kycNotes}
          </Alert>
        )}
        {missing.length > 0 && (
          <Alert tone="warning" className="mt-4" title="Incomplete">
            Missing: {missing.join(", ")}. Edit these on the Overview tab or ask the partner to update their profile.
          </Alert>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => setAction("VERIFIED")} disabled={partner.kycStatus === "VERIFIED"}>
            <BadgeCheck className="size-4" /> Mark verified
          </Button>
          <Button variant="outline" onClick={() => setAction("REJECTED")} disabled={partner.kycStatus === "REJECTED"}>
            <XCircle className="size-4" /> Reject
          </Button>
          {partner.kycStatus !== "PENDING" && (
            <Button variant="ghost" onClick={() => setAction("PENDING")}>
              Reset to pending
            </Button>
          )}
        </div>
      </Section>

      <Section title="Razorpay Route linked account" description="Needed to release payouts through Razorpay Route transfers.">
        {partner.razorpayLinkedAccountId ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2">
              <div>
                <p className="text-xs text-muted">Linked account ID</p>
                <p className="font-mono text-sm">{partner.razorpayLinkedAccountId}</p>
              </div>
              <CopyButton value={partner.razorpayLinkedAccountId} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm">
                Payouts:{" "}
                <strong className={payoutsActive ? "text-success" : "text-warning"}>
                  {payoutsActive ? "Active" : "Awaiting activation"}
                </strong>
              </span>
              <Button
                variant={payoutsActive ? "outline" : "primary"}
                loading={activating}
                onClick={async () => {
                  setActivating(true);
                  try {
                    const next = await api<PartnerDetail>(`/admin/partners/${partner.id}/payouts`, {
                      method: "POST",
                      body: { active: !payoutsActive },
                    });
                    onUpdated(next);
                    toast.success(payoutsActive ? "Payouts deactivated" : "Payouts activated");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Could not update payouts");
                  } finally {
                    setActivating(false);
                  }
                }}
              >
                {payoutsActive ? "Deactivate payouts" : "Activate payouts"}
              </Button>
            </div>
            {!payoutsActive && (
              <Alert tone="warning">
                This linked account was created by the partner. Activate it to start routing settlements to their bank account.
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-ink-2">No linked account yet. It&apos;s created from the partner&apos;s KYC and bank details (legal name, PAN, bank account, IFSC and the first property&apos;s address).</p>
            {partner.kycStatus !== "VERIFIED" && <Alert tone="warning">Verify KYC before creating the linked account.</Alert>}
            <Button
              loading={linking}
              disabled={missing.length > 0}
              onClick={async () => {
                setLinking(true);
                try {
                  const next = await api<PartnerDetail>(`/admin/partners/${partner.id}/linked-account`, { method: "POST", body: {} });
                  onUpdated(next);
                  toast.success("Linked account created");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not create linked account");
                } finally {
                  setLinking(false);
                }
              }}
            >
              <Link2 className="size-4" /> Create linked account
            </Button>
          </div>
        )}
      </Section>

      <ConfirmDialog
        open={!!action}
        onClose={() => setAction(null)}
        title={action === "VERIFIED" ? "Mark KYC verified?" : action === "REJECTED" ? "Reject KYC?" : "Reset KYC to pending?"}
        description={action === "REJECTED" ? "The partner is emailed with your notes." : action === "VERIFIED" ? "The partner is notified by email." : undefined}
        confirmLabel={action === "VERIFIED" ? "Verify" : action === "REJECTED" ? "Reject" : "Reset"}
        tone={action === "REJECTED" ? "danger" : "primary"}
        notes={{ label: "Notes", required: action === "REJECTED", placeholder: action === "REJECTED" ? "What needs to be corrected?" : "Optional" }}
        onConfirm={async (notes) => {
          const next = await api<PartnerDetail>(`/admin/partners/${partner.id}/kyc`, { method: "POST", body: { status: action, notes: notes || undefined } });
          onUpdated(next);
          toast.success("KYC status updated");
        }}
      />
    </div>
  );
}

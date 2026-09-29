"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { errorMessage, fieldErrors } from "@/lib/use-api";
import type { PartnerDetail } from "@/lib/types";
import { Button, Field, Select, useToast } from "@/components/ui";
import { KeyValue, SaveBar, Section } from "@/components/panel/page";
import { sameJson, useUnsavedChanges } from "@/components/panel/unsaved";
import { commissionLabel, settlementScheduleLabel } from "@/components/panel/labels";
import { formatDate } from "@/lib/format";
import {
  BankSection,
  BusinessSection,
  CommissionSection,
  ContactSection,
  PoliciesSection,
  SettlementSection,
  partnerFormFromDetail,
  toPatchPayload,
  validatePartnerForm,
  type Errors,
  type PartnerFormState,
} from "../../../_components/partner-form";

export function OverviewTab({ partner, onUpdated }: { partner: PartnerDetail; onUpdated: (p: PartnerDetail) => void }) {
  const toast = useToast();
  const [initial, setInitial] = useState(() => partnerFormFromDetail(partner));
  const [s, setS] = useState<PartnerFormState>(initial);
  const [status, setStatus] = useState(partner.status);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const dirty = !sameJson(s, initial) || status !== partner.status;
  useUnsavedChanges(dirty);

  const set = (patch: Partial<PartnerFormState>) => {
    setS((prev) => ({ ...prev, ...patch }));
    setErrors((e) => {
      const n = { ...e };
      for (const k of Object.keys(patch)) delete n[k];
      return n;
    });
  };

  const save = async () => {
    const errs = validatePartnerForm(s, "edit");
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setBusy(true);
    try {
      const next = await api<PartnerDetail>(`/admin/partners/${partner.id}`, { method: "PATCH", body: { ...toPatchPayload(s), status } });
      const form = partnerFormFromDetail(next);
      setInitial(form);
      setS(form);
      onUpdated(next);
      toast.success("Partner saved");
    } catch (e) {
      setErrors(fieldErrors(e));
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const props = { s, set, errors, mode: "edit" as const, detail: partner };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      noValidate
      className="space-y-4"
    >
      <Section title="Summary">
        <KeyValue
          cols={3}
          items={[
            { label: "Default commission", value: commissionLabel(partner.defaultCommissionType, partner.defaultCommissionValue) },
            { label: "Settlement", value: settlementScheduleLabel(partner) },
            { label: "Properties", value: partner.properties.length },
            { label: "Bank account", value: partner.bankAccountLast4 ? `•••• ${partner.bankAccountLast4} (${partner.bankIfsc ?? "—"})` : "Not added" },
            { label: "Razorpay linked account", value: partner.razorpayLinkedAccountId ?? "Not created" },
            { label: "Partner since", value: formatDate(partner.createdAt) },
          ]}
        />
      </Section>
      <Section title="Account status">
        <Field label="Status" hint="Suspended partners can't sign in; their properties stay as they are unless suspended individually." className="max-w-xs">
          <Select value={status} onChange={(e) => setStatus(e.target.value as PartnerDetail["status"])}>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </Field>
      </Section>
      <Section title="Business">
        <BusinessSection {...props} />
      </Section>
      <Section title="Contact & KYC details">
        <ContactSection {...props} />
      </Section>
      <Section title="Bank account">
        <BankSection {...props} />
      </Section>
      <Section title="Settlement">
        <SettlementSection {...props} />
      </Section>
      <Section title="Default commission">
        <CommissionSection {...props} />
      </Section>
      <Section title="Default policies & terms">
        <PoliciesSection {...props} />
      </Section>
      <SaveBar dirty={dirty}>
        <Button
          variant="outline"
          disabled={!dirty || busy}
          onClick={() => {
            setS(initial);
            setStatus(partner.status);
            setErrors({});
          }}
        >
          Discard
        </Button>
        <Button type="submit" loading={busy} disabled={!dirty}>
          Save changes
        </Button>
      </SaveBar>
    </form>
  );
}

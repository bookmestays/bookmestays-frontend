"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage, fieldErrors } from "@/lib/use-api";
import type { PartnerDetail, User } from "@/lib/types";
import { Button, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { PageHeader, Section } from "@/components/panel/page";
import { useUnsavedChanges } from "@/components/panel/unsaved";
import { useSiteMeta } from "@/components/panel/util";
import {
  BankSection,
  BusinessSection,
  CommissionSection,
  ContactSection,
  FIELD_SECTION,
  PoliciesSection,
  PropertySection,
  SECTIONS,
  SECTION_LABELS,
  SettlementSection,
  emptyPartnerForm,
  toCreatePayload,
  validatePartnerForm,
  type Errors,
  type PartnerFormState,
  type SectionKey,
} from "../../../_components/partner-form";
import { CredentialsDialog } from "../../../_components/credentials-dialog";

type CreateResult = { partner: PartnerDetail; owner: User; tempPassword: string };

export default function NewPartnerPage() {
  const router = useRouter();
  const toast = useToast();
  const meta = useSiteMeta();
  const [s, setS] = useState<PartnerFormState>(emptyPartnerForm);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [result, setResult] = useState<CreateResult | null>(null);
  useUnsavedChanges(dirty && !result);

  const set = (patch: Partial<PartnerFormState>) => {
    setS((prev) => ({ ...prev, ...patch }));
    setDirty(true);
    // clear errors for edited fields
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k];
      return next;
    });
  };

  const key: SectionKey = SECTIONS[step];
  const last = step === SECTIONS.length - 1;

  const next = () => {
    const errs = validatePartnerForm(s, "create", key);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setStep((n) => Math.min(SECTIONS.length - 1, n + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    const errs = validatePartnerForm(s, "create");
    setErrors(errs);
    const firstBad = Object.keys(errs)[0];
    if (firstBad) {
      const sec = FIELD_SECTION[firstBad];
      if (sec) setStep(SECTIONS.indexOf(sec));
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setBusy(true);
    try {
      const res = await api<CreateResult>("/admin/partners", { method: "POST", body: toCreatePayload(s) });
      setDirty(false);
      setResult(res);
      toast.success(`${res.partner.displayName} created`);
    } catch (e) {
      const fe = fieldErrors(e);
      if (Object.keys(fe).length) {
        setErrors(fe);
        const sec = FIELD_SECTION[Object.keys(fe)[0]];
        if (sec) setStep(SECTIONS.indexOf(sec));
      }
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const props = { s, set, errors, mode: "create" as const };

  return (
    <>
      <PageHeader title="New partner" description="Create the hotel's business profile and partner-panel login." breadcrumbs={[{ label: "Partners", href: "/admin/partners" }, { label: "New" }]} />

      <ol className="mb-5 flex gap-1 overflow-x-auto pb-1" aria-label="Steps">
        {SECTIONS.map((sec, i) => {
          const hasErr = Object.keys(errors).some((k) => FIELD_SECTION[k] === sec);
          return (
            <li key={sec} className="shrink-0">
              <button
                type="button"
                onClick={() => (i < step ? setStep(i) : i > step ? next() : undefined)}
                aria-current={i === step ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap",
                  i === step ? "border-brand bg-brand text-white" : i < step ? "border-line bg-white text-ink" : "border-line bg-white text-muted",
                  hasErr && i !== step && "border-danger text-danger",
                )}
              >
                <span className={cn("grid size-5 place-items-center rounded-full text-[11px]", i === step ? "bg-white/20" : "bg-surface-2")}>
                  {i < step ? <Check className="size-3" /> : i + 1}
                </span>
                {SECTION_LABELS[sec]}
              </button>
            </li>
          );
        })}
      </ol>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (last) submit();
          else next();
        }}
        noValidate
      >
        <Section title={SECTION_LABELS[key]} description={`Step ${step + 1} of ${SECTIONS.length}`}>
          {key === "business" && <BusinessSection {...props} />}
          {key === "contact" && <ContactSection {...props} />}
          {key === "bank" && <BankSection {...props} />}
          {key === "settlement" && <SettlementSection {...props} />}
          {key === "commission" && <CommissionSection {...props} />}
          {key === "policies" && <PoliciesSection {...props} />}
          {key === "property" && <PropertySection {...props} cities={meta.data?.cities ?? []} />}
        </Section>

        <div className="sticky bottom-0 z-20 -mx-3 mt-6 flex items-center justify-between gap-2 border-t border-line bg-white/95 px-3 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <Button variant="outline" onClick={() => setStep((n) => Math.max(0, n - 1))} disabled={step === 0}>
            <ChevronLeft className="size-4" /> Back
          </Button>
          {last ? (
            <Button type="submit" loading={busy}>
              <Check className="size-4" /> Create partner
            </Button>
          ) : (
            <Button type="submit">
              Next <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </form>

      {result && (
        <CredentialsDialog
          open
          onClose={() => router.push(`/admin/partners/${result.partner.id}`)}
          title="Partner created"
          login={result.owner.email}
          tempPassword={result.tempPassword}
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setResult(null);
                  setS(emptyPartnerForm());
                  setStep(0);
                }}
              >
                Create another
              </Button>
              <Button onClick={() => router.push(`/admin/partners/${result.partner.id}`)}>Open partner</Button>
            </>
          }
        />
      )}
    </>
  );
}

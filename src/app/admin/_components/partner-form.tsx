"use client";

import type { CancellationPolicy, CommissionType, CreatePartnerInput, PartnerDetail, PropertyType, SettlementCycle } from "@/lib/types";
import { PROPERTY_TYPE_LABELS } from "@/lib/types";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { CancellationPolicyEditor, validatePolicy } from "@/components/panel/cancellation-policy-editor";
import { CommissionInput, NumberInput } from "@/components/panel/inputs";
import { SETTLEMENT_CYCLE_LABELS, WEEKDAYS, commissionLabel, settlementScheduleLabel } from "@/components/panel/labels";
import { EMAIL_RE, GSTIN_RE, IFSC_RE, PAN_RE, PHONE_RE, nullIfEmpty, omitIfEmpty } from "@/components/panel/util";
import type { CityLite } from "@/lib/types";

export type PartnerFormState = {
  legalName: string;
  displayName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  gstin: string;
  pan: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankAccountNumberConfirm: string;
  bankIfsc: string;
  settlementCycle: SettlementCycle;
  settlementDayOfWeek: number | null;
  settlementDayOfMonth: number | null;
  settlementDelayDays: number | null;
  defaultCommissionType: CommissionType;
  defaultCommissionValue: number | null;
  defaultCancellationPolicy: CancellationPolicy | null;
  defaultTerms: string;
  addProperty: boolean;
  propertyName: string;
  propertyType: PropertyType;
  propertyCityId: string;
  sendWelcomeEmail: boolean;
};

export type Errors = Partial<Record<keyof PartnerFormState | string, string>>;
export type SectionProps = { s: PartnerFormState; set: (patch: Partial<PartnerFormState>) => void; errors: Errors; mode: "create" | "edit"; detail?: PartnerDetail };

export const emptyPartnerForm = (): PartnerFormState => ({
  legalName: "",
  displayName: "",
  contactName: "",
  email: "",
  phone: "",
  address: "",
  gstin: "",
  pan: "",
  bankAccountName: "",
  bankAccountNumber: "",
  bankAccountNumberConfirm: "",
  bankIfsc: "",
  settlementCycle: "WEEKLY",
  settlementDayOfWeek: 2,
  settlementDayOfMonth: 5,
  settlementDelayDays: 1,
  defaultCommissionType: "PERCENT",
  defaultCommissionValue: 1500,
  defaultCancellationPolicy: {
    summary: "Free cancellation up to 48 hours before check-in. 50% refund up to 24 hours before check-in.",
    rules: [
      { hoursBeforeCheckIn: 48, refundPercent: 100 },
      { hoursBeforeCheckIn: 24, refundPercent: 50 },
      { hoursBeforeCheckIn: 0, refundPercent: 0 },
    ],
  },
  defaultTerms: "",
  addProperty: true,
  propertyName: "",
  propertyType: "HOTEL",
  propertyCityId: "",
  sendWelcomeEmail: true,
});

export const partnerFormFromDetail = (p: PartnerDetail): PartnerFormState => ({
  ...emptyPartnerForm(),
  legalName: p.legalName,
  displayName: p.displayName,
  contactName: p.contactName,
  email: p.email,
  phone: p.phone,
  address: p.address ?? "",
  gstin: p.gstin ?? "",
  pan: p.pan ?? "",
  bankAccountName: p.bankAccountName ?? "",
  bankIfsc: p.bankIfsc ?? "",
  settlementCycle: p.settlementCycle,
  settlementDayOfWeek: p.settlementDayOfWeek,
  settlementDayOfMonth: p.settlementDayOfMonth,
  settlementDelayDays: p.settlementDelayDays,
  defaultCommissionType: p.defaultCommissionType,
  defaultCommissionValue: p.defaultCommissionValue,
  defaultCancellationPolicy: p.defaultCancellationPolicy,
  defaultTerms: p.defaultTerms ?? "",
  addProperty: false,
});

export const SECTIONS = ["business", "contact", "bank", "settlement", "commission", "policies", "property"] as const;
export type SectionKey = (typeof SECTIONS)[number];
export const SECTION_LABELS: Record<SectionKey, string> = {
  business: "Business",
  contact: "Contact & KYC",
  bank: "Bank account",
  settlement: "Settlement",
  commission: "Commission",
  policies: "Policies & terms",
  property: "First property",
};

/** Field → section, for jumping to the first invalid step. */
export const FIELD_SECTION: Record<string, SectionKey> = {
  legalName: "business",
  displayName: "business",
  address: "business",
  contactName: "contact",
  email: "contact",
  phone: "contact",
  gstin: "contact",
  pan: "contact",
  bankAccountName: "bank",
  bankAccountNumber: "bank",
  bankAccountNumberConfirm: "bank",
  bankIfsc: "bank",
  settlementCycle: "settlement",
  settlementDayOfWeek: "settlement",
  settlementDayOfMonth: "settlement",
  settlementDelayDays: "settlement",
  defaultCommissionType: "commission",
  defaultCommissionValue: "commission",
  defaultCancellationPolicy: "policies",
  defaultTerms: "policies",
  propertyName: "property",
  propertyCityId: "property",
};

export function validatePartnerForm(s: PartnerFormState, mode: "create" | "edit", only?: SectionKey): Errors {
  const e: Errors = {};
  const need = (k: keyof PartnerFormState, label: string, min = 2) => {
    const v = String(s[k] ?? "").trim();
    if (v.length < min) e[k] = `${label} is required`;
  };
  need("legalName", "Legal name");
  need("displayName", "Display name");
  need("contactName", "Contact name");
  if (!EMAIL_RE.test(s.email.trim())) e.email = "Enter a valid email";
  if (!PHONE_RE.test(s.phone.trim())) e.phone = "Enter a valid phone number (10+ digits)";
  if (s.gstin.trim() && !GSTIN_RE.test(s.gstin.trim().toUpperCase())) e.gstin = "GSTIN must be 15 characters, e.g. 29ABCDE1234F1Z5";
  if (s.pan.trim() && !PAN_RE.test(s.pan.trim().toUpperCase())) e.pan = "PAN format: ABCDE1234F";
  if (s.bankAccountNumber.trim() && !/^[0-9]{6,20}$/.test(s.bankAccountNumber.trim())) e.bankAccountNumber = "6–20 digits";
  if (s.bankAccountNumber.trim() && s.bankAccountNumber.trim() !== s.bankAccountNumberConfirm.trim()) e.bankAccountNumberConfirm = "Account numbers don't match";
  if (s.bankIfsc.trim() && !IFSC_RE.test(s.bankIfsc.trim().toUpperCase())) e.bankIfsc = "IFSC format: HDFC0001234";
  if ((s.settlementCycle === "WEEKLY" || s.settlementCycle === "BIWEEKLY") && s.settlementDayOfWeek == null) e.settlementDayOfWeek = "Pick a payout day";
  if (s.settlementCycle === "MONTHLY" && (s.settlementDayOfMonth == null || s.settlementDayOfMonth < 1 || s.settlementDayOfMonth > 28)) e.settlementDayOfMonth = "Day 1–28";
  if (s.settlementDelayDays == null || s.settlementDelayDays < 0 || s.settlementDelayDays > 90) e.settlementDelayDays = "0–90 days";
  if (s.defaultCommissionValue == null) e.defaultCommissionValue = "Enter the default commission";
  else if (s.defaultCommissionType === "PERCENT" && s.defaultCommissionValue > 10000) e.defaultCommissionValue = "Cannot exceed 100%";
  const pErr = validatePolicy(s.defaultCancellationPolicy);
  if (pErr) e.defaultCancellationPolicy = pErr;
  if (mode === "create" && s.addProperty) {
    if (s.propertyName.trim().length < 2) e.propertyName = "Property name is required";
    if (!s.propertyCityId) e.propertyCityId = "Choose a city";
  }
  if (!only) return e;
  return Object.fromEntries(Object.entries(e).filter(([k]) => FIELD_SECTION[k] === only));
}

/** Common fields → API payload (empty optional strings are omitted). */
function commonPayload(s: PartnerFormState) {
  const isWeekly = s.settlementCycle === "WEEKLY" || s.settlementCycle === "BIWEEKLY";
  return {
    legalName: s.legalName.trim(),
    displayName: s.displayName.trim(),
    contactName: s.contactName.trim(),
    email: s.email.trim().toLowerCase(),
    phone: s.phone.trim().replace(/[\s-]/g, ""),
    settlementCycle: s.settlementCycle,
    settlementDayOfWeek: isWeekly ? (s.settlementDayOfWeek ?? undefined) : undefined,
    settlementDayOfMonth: s.settlementCycle === "MONTHLY" ? (s.settlementDayOfMonth ?? undefined) : undefined,
    settlementDelayDays: s.settlementDelayDays ?? 0,
    defaultCommissionType: s.defaultCommissionType,
    defaultCommissionValue: s.defaultCommissionValue ?? 0,
    defaultCancellationPolicy: s.defaultCancellationPolicy ?? undefined,
  };
}

export function toCreatePayload(s: PartnerFormState): CreatePartnerInput {
  return {
    ...commonPayload(s),
    address: omitIfEmpty(s.address),
    gstin: omitIfEmpty(s.gstin.toUpperCase()),
    pan: omitIfEmpty(s.pan.toUpperCase()),
    bankAccountName: omitIfEmpty(s.bankAccountName),
    bankAccountNumber: omitIfEmpty(s.bankAccountNumber),
    bankIfsc: omitIfEmpty(s.bankIfsc.toUpperCase()),
    defaultTerms: omitIfEmpty(s.defaultTerms),
    property: s.addProperty ? { name: s.propertyName.trim(), type: s.propertyType, cityId: s.propertyCityId } : undefined,
    sendWelcomeEmail: s.sendWelcomeEmail,
  };
}

export function toPatchPayload(s: PartnerFormState) {
  const isWeekly = s.settlementCycle === "WEEKLY" || s.settlementCycle === "BIWEEKLY";
  return {
    ...commonPayload(s),
    settlementDayOfWeek: isWeekly ? s.settlementDayOfWeek : null,
    settlementDayOfMonth: s.settlementCycle === "MONTHLY" ? s.settlementDayOfMonth : null,
    address: nullIfEmpty(s.address),
    gstin: nullIfEmpty(s.gstin.toUpperCase()),
    pan: nullIfEmpty(s.pan.toUpperCase()),
    bankAccountName: nullIfEmpty(s.bankAccountName),
    // only send a new account number when entered
    ...(s.bankAccountNumber.trim() ? { bankAccountNumber: s.bankAccountNumber.trim() } : {}),
    bankIfsc: nullIfEmpty(s.bankIfsc.toUpperCase()),
    defaultCancellationPolicy: s.defaultCancellationPolicy,
    defaultTerms: nullIfEmpty(s.defaultTerms),
  };
}

// ─── Sections ────────────────────────────────────────────────────────────────

export function BusinessSection({ s, set, errors }: SectionProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Legal / registered name" required error={errors.legalName} hint="As on GST / bank records">
        <Input value={s.legalName} onChange={(e) => set({ legalName: e.target.value })} aria-invalid={!!errors.legalName} placeholder="Sea Breeze Hospitality Pvt Ltd" />
      </Field>
      <Field label="Display name" required error={errors.displayName} hint="Shown in the partner panel and on statements">
        <Input value={s.displayName} onChange={(e) => set({ displayName: e.target.value })} aria-invalid={!!errors.displayName} placeholder="Sea Breeze Resorts" />
      </Field>
      <Field label="Registered address" className="sm:col-span-2" error={errors.address}>
        <Textarea rows={2} value={s.address} onChange={(e) => set({ address: e.target.value })} />
      </Field>
    </div>
  );
}

export function ContactSection({ s, set, errors, mode }: SectionProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Contact person" required error={errors.contactName}>
        <Input value={s.contactName} onChange={(e) => set({ contactName: e.target.value })} aria-invalid={!!errors.contactName} autoComplete="off" />
      </Field>
      <Field label="Email" required error={errors.email} hint={mode === "create" ? "The owner signs in with this email" : undefined}>
        <Input type="email" value={s.email} onChange={(e) => set({ email: e.target.value })} aria-invalid={!!errors.email} autoComplete="off" />
      </Field>
      <Field label="Phone" required error={errors.phone}>
        <Input type="tel" value={s.phone} onChange={(e) => set({ phone: e.target.value })} aria-invalid={!!errors.phone} placeholder="+91 98xxxxxxxx" autoComplete="off" />
      </Field>
      <div className="hidden sm:block" />
      <Field label="GSTIN" error={errors.gstin} hint="Optional — required for GST invoices">
        <Input value={s.gstin} onChange={(e) => set({ gstin: e.target.value.toUpperCase() })} maxLength={15} aria-invalid={!!errors.gstin} className="font-mono uppercase" />
      </Field>
      <Field label="PAN" error={errors.pan}>
        <Input value={s.pan} onChange={(e) => set({ pan: e.target.value.toUpperCase() })} maxLength={10} aria-invalid={!!errors.pan} className="font-mono uppercase" />
      </Field>
    </div>
  );
}

export function BankSection({ s, set, errors, mode, detail }: SectionProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {mode === "edit" && detail?.bankAccountLast4 && (
        <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-ink-2 sm:col-span-2">
          Current account: •••• {detail.bankAccountLast4}. Enter a new number only to replace it.
        </p>
      )}
      <Field label="Account holder name" error={errors.bankAccountName}>
        <Input value={s.bankAccountName} onChange={(e) => set({ bankAccountName: e.target.value })} />
      </Field>
      <Field label="IFSC" error={errors.bankIfsc}>
        <Input value={s.bankIfsc} onChange={(e) => set({ bankIfsc: e.target.value.toUpperCase() })} maxLength={11} aria-invalid={!!errors.bankIfsc} className="font-mono uppercase" />
      </Field>
      <Field label={mode === "edit" ? "New account number" : "Account number"} error={errors.bankAccountNumber}>
        <Input inputMode="numeric" value={s.bankAccountNumber} onChange={(e) => set({ bankAccountNumber: e.target.value.replace(/\D/g, "") })} aria-invalid={!!errors.bankAccountNumber} className="font-mono" autoComplete="off" />
      </Field>
      <Field label="Confirm account number" error={errors.bankAccountNumberConfirm}>
        <Input
          inputMode="numeric"
          value={s.bankAccountNumberConfirm}
          onChange={(e) => set({ bankAccountNumberConfirm: e.target.value.replace(/\D/g, "") })}
          aria-invalid={!!errors.bankAccountNumberConfirm}
          className="font-mono"
          autoComplete="off"
          onPaste={(e) => e.preventDefault()}
        />
      </Field>
      <p className="text-xs text-muted sm:col-span-2">Bank details are encrypted; only the last 4 digits are shown afterwards. Changing bank details resets KYC to “submitted”.</p>
    </div>
  );
}

export function SettlementSection({ s, set, errors }: SectionProps) {
  const weekly = s.settlementCycle === "WEEKLY" || s.settlementCycle === "BIWEEKLY";
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">Settlement cycle</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(SETTLEMENT_CYCLE_LABELS) as SettlementCycle[]).map((c) => (
            <label key={c} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${s.settlementCycle === c ? "border-brand bg-brand-soft/40" : "border-line"}`}>
              <input type="radio" name="settlementCycle" className="accent-brand" checked={s.settlementCycle === c} onChange={() => set({ settlementCycle: c })} />
              {SETTLEMENT_CYCLE_LABELS[c]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        {weekly && (
          <Field label="Payout day" required error={errors.settlementDayOfWeek}>
            <Select value={s.settlementDayOfWeek ?? ""} onChange={(e) => set({ settlementDayOfWeek: e.target.value === "" ? null : Number(e.target.value) })}>
              <option value="">Select day</option>
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {s.settlementCycle === "MONTHLY" && (
          <Field label="Day of month" required error={errors.settlementDayOfMonth} hint="1–28 so every month has it">
            <NumberInput min={1} max={28} value={s.settlementDayOfMonth} onChange={(v) => set({ settlementDayOfMonth: v })} aria-invalid={!!errors.settlementDayOfMonth} />
          </Field>
        )}
        <Field label="Settlement delay (days after check-out)" required error={errors.settlementDelayDays} hint="Buffer for disputes/no-shows before a stay becomes payable">
          <NumberInput min={0} max={90} value={s.settlementDelayDays} onChange={(v) => set({ settlementDelayDays: v })} aria-invalid={!!errors.settlementDelayDays} />
        </Field>
      </div>
      <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-ink-2">
        Schedule: <strong className="text-ink">{settlementScheduleLabel(s)}</strong>
      </p>
    </div>
  );
}

export function CommissionSection({ s, set, errors, mode }: SectionProps) {
  return (
    <div className="space-y-3">
      <Field label="Default commission" required error={errors.defaultCommissionValue} hint="Percentage of room amount, or a flat fee per room-night. Property and room-type rules override this.">
        <CommissionInput
          type={s.defaultCommissionType}
          value={s.defaultCommissionValue}
          invalid={!!errors.defaultCommissionValue}
          onChange={(v) => set({ defaultCommissionType: v.type, defaultCommissionValue: v.value })}
        />
      </Field>
      {s.defaultCommissionValue != null && <p className="text-sm text-ink-2">BookMeStays keeps {commissionLabel(s.defaultCommissionType, s.defaultCommissionValue)} (+ GST on commission).</p>}
      {mode === "create" && <p className="text-xs text-muted">Room-type specific commission can be set when approving each room type, or later under the partner&apos;s Commission tab.</p>}
    </div>
  );
}

export function PoliciesSection({ s, set, errors }: SectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-1 text-sm font-semibold text-ink">Default cancellation policy</h3>
        <p className="mb-3 text-xs text-muted">New properties inherit this; hotels can change it per property or rate plan.</p>
        <CancellationPolicyEditor value={s.defaultCancellationPolicy} onChange={(p) => set({ defaultCancellationPolicy: p })} idPrefix="partner-cp" />
        {errors.defaultCancellationPolicy && <p className="mt-1 text-xs text-danger">{errors.defaultCancellationPolicy}</p>}
      </div>
      <Field label="Terms & conditions" hint="Shown to guests at checkout for this partner's properties (unless overridden per property).">
        <Textarea rows={6} value={s.defaultTerms} onChange={(e) => set({ defaultTerms: e.target.value })} />
      </Field>
    </div>
  );
}

export function PropertySection({ s, set, errors, cities }: SectionProps & { cities: CityLite[] }) {
  return (
    <div className="space-y-4">
      <Checkbox label="Create the first property now (as a draft the hotel completes)" checked={s.addProperty} onChange={(e) => set({ addProperty: e.target.checked })} />
      {s.addProperty && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Property name" required error={errors.propertyName} className="sm:col-span-3">
            <Input value={s.propertyName} onChange={(e) => set({ propertyName: e.target.value })} aria-invalid={!!errors.propertyName} />
          </Field>
          <Field label="Type" required>
            <Select value={s.propertyType} onChange={(e) => set({ propertyType: e.target.value as PropertyType })}>
              {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((t) => (
                <option key={t} value={t}>
                  {PROPERTY_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="City" required error={errors.propertyCityId} className="sm:col-span-2">
            <Select value={s.propertyCityId} onChange={(e) => set({ propertyCityId: e.target.value })} aria-invalid={!!errors.propertyCityId}>
              <option value="">Select city</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.state ? `, ${c.state}` : ""}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}
      <Checkbox label="Email the login details to the partner" checked={s.sendWelcomeEmail} onChange={(e) => set({ sendWelcomeEmail: e.target.checked })} />
    </div>
  );
}

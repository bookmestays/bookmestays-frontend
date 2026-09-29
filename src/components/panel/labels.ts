import type {
  BookingStatus,
  ChannelConnectionStatus,
  ChannelSyncLog,
  CommissionType,
  KycStatus,
  MediaTag,
  PropertyStatus,
  RoomTypeStatus,
  SettlementCycle,
  SettlementStatus,
} from "@/lib/types";
import { formatINR } from "@/lib/format";

export type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";
type StatusMap<K extends string> = Record<K, { label: string; tone: Tone }>;

export const PROPERTY_STATUS: StatusMap<PropertyStatus> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  PENDING_REVIEW: { label: "Pending review", tone: "warning" },
  LIVE: { label: "Live", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
  SUSPENDED: { label: "Suspended", tone: "danger" },
};
export const ROOM_TYPE_STATUS: StatusMap<RoomTypeStatus> = {
  PENDING_APPROVAL: { label: "Pending approval", tone: "warning" },
  ACTIVE: { label: "Active", tone: "success" },
  INACTIVE: { label: "Inactive", tone: "neutral" },
};
export const BOOKING_STATUS: StatusMap<BookingStatus> = {
  PENDING_PAYMENT: { label: "Pending payment", tone: "warning" },
  CONFIRMED: { label: "Confirmed", tone: "info" },
  CHECKED_IN: { label: "Checked in", tone: "brand" },
  COMPLETED: { label: "Completed", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "danger" },
  NO_SHOW: { label: "No-show", tone: "danger" },
  EXPIRED: { label: "Expired", tone: "neutral" },
};
export const SETTLEMENT_STATUS: StatusMap<SettlementStatus> = {
  PENDING: { label: "Pending", tone: "warning" },
  APPROVED: { label: "Approved", tone: "info" },
  PROCESSING: { label: "Processing", tone: "info" },
  PAID: { label: "Paid", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
  ON_HOLD: { label: "On hold", tone: "danger" },
};
export const KYC_STATUS: StatusMap<KycStatus> = {
  PENDING: { label: "KYC pending", tone: "neutral" },
  SUBMITTED: { label: "KYC submitted", tone: "warning" },
  VERIFIED: { label: "KYC verified", tone: "success" },
  REJECTED: { label: "KYC rejected", tone: "danger" },
};
export const CHANNEL_STATUS: StatusMap<ChannelConnectionStatus> = {
  PENDING: { label: "Pending", tone: "warning" },
  ACTIVE: { label: "Active", tone: "success" },
  DISABLED: { label: "Disabled", tone: "neutral" },
  ERROR: { label: "Error", tone: "danger" },
};
export const SYNC_STATUS: StatusMap<ChannelSyncLog["status"]> = {
  PENDING: { label: "Pending", tone: "warning" },
  SUCCESS: { label: "Success", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
  RETRYING: { label: "Retrying", tone: "warning" },
};
export const PARTNER_STATUS: StatusMap<"ACTIVE" | "SUSPENDED" | "INACTIVE"> = {
  ACTIVE: { label: "Active", tone: "success" },
  SUSPENDED: { label: "Suspended", tone: "danger" },
  INACTIVE: { label: "Inactive", tone: "neutral" },
};
export const REVIEW_STATUS: StatusMap<string> = {
  PENDING: { label: "Pending", tone: "warning" },
  PUBLISHED: { label: "Published", tone: "success" },
  APPROVED: { label: "Published", tone: "success" },
  HIDDEN: { label: "Hidden", tone: "neutral" },
  REJECTED: { label: "Rejected", tone: "danger" },
};

export const STATUS_MAPS = {
  property: PROPERTY_STATUS,
  roomType: ROOM_TYPE_STATUS,
  booking: BOOKING_STATUS,
  settlement: SETTLEMENT_STATUS,
  kyc: KYC_STATUS,
  channel: CHANNEL_STATUS,
  sync: SYNC_STATUS,
  partner: PARTNER_STATUS,
  review: REVIEW_STATUS,
} as const;

export const SETTLEMENT_CYCLE_LABELS: Record<SettlementCycle, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Every two weeks",
  MONTHLY: "Monthly",
  AFTER_CHECKOUT: "After check-out",
};
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const MEDIA_TAG_LABELS: Record<MediaTag, string> = {
  EXTERIOR: "Exterior",
  ROOM_WALKTHROUGH: "Room walkthrough",
  ROOM: "Room",
  BATHROOM: "Bathroom",
  VIEW: "View",
  COMMON_AREA: "Common area",
  POOL: "Pool",
  DINING: "Dining",
  SURROUNDINGS: "Surroundings",
  EXPERIENCE: "Experience",
  AMENITY: "Amenity",
  OTHER: "Other",
};

export const PERMISSIONS: { value: string; label: string; hint: string }[] = [
  { value: "content", label: "Content", hint: "Property details, photos, rooms" },
  { value: "inventory", label: "Inventory", hint: "Rates & availability" },
  { value: "bookings", label: "Bookings", hint: "View and manage bookings" },
  { value: "payouts", label: "Payouts", hint: "Settlements and ledger" },
  { value: "reviews", label: "Reviews", hint: "Reply to guest reviews" },
];

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super admin",
  ADMIN_STAFF: "Admin staff",
  PARTNER_OWNER: "Owner",
  PARTNER_STAFF: "Staff",
  CUSTOMER: "Customer",
};

export function commissionLabel(type: CommissionType, value: number) {
  return type === "PERCENT" ? `${(value / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}%` : `${formatINR(value)} / room-night`;
}

export function settlementScheduleLabel(p: {
  settlementCycle: SettlementCycle;
  settlementDayOfWeek?: number | null;
  settlementDayOfMonth?: number | null;
  settlementDelayDays?: number | null;
}) {
  const base = SETTLEMENT_CYCLE_LABELS[p.settlementCycle];
  let when = "";
  if ((p.settlementCycle === "WEEKLY" || p.settlementCycle === "BIWEEKLY") && p.settlementDayOfWeek != null) when = ` on ${WEEKDAYS[p.settlementDayOfWeek]}`;
  if (p.settlementCycle === "MONTHLY" && p.settlementDayOfMonth != null) when = ` on day ${p.settlementDayOfMonth}`;
  const delay = p.settlementDelayDays ? ` · ${p.settlementDelayDays} day${p.settlementDelayDays === 1 ? "" : "s"} after check-out` : "";
  return `${base}${when}${delay}`;
}

export const formatDateTime = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso))
    : "—";

export const humanize = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

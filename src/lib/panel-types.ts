// Panel-only DTOs for endpoints whose response shape isn't pinned in src/lib/types.ts.
// Field names follow the backend DB schema (bookmestays-backend/src/db/schema.ts).
// Money = paise, percentages = basis points.
import type {
  Amenity,
  Area,
  Banner,
  BookingDetail,
  ChannelConnection,
  ChannelSyncLog,
  CityLite,
  CollectionCard,
  HomeSectionType,
  LedgerEntry,
  Paginated,
  RatePlan,
  Review,
  Role,
  RoomTypeStatus,
  Seo,
  User,
} from "./types";

export type AdminBanner = Banner & {
  propertyId?: string | null;
  sort: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

export type HomeSectionConfig = {
  limit?: number;
  cityId?: string;
  citySlug?: string;
  propertyIds?: string[];
  [key: string]: unknown;
};
export type AdminHomeSection = {
  id: string;
  type: HomeSectionType;
  title: string;
  subtitle: string | null;
  config: HomeSectionConfig;
  sort: number;
  isActive: boolean;
};

export type AdminCity = CityLite & {
  country?: string;
  intro: string | null;
  travelInfo: string | null;
  foodGuide: string | null;
  lat: number | null;
  lng: number | null;
  coverImageUrl: string | null;
  isFeatured: boolean;
  isActive: boolean;
  sort: number;
  seo: Seo | null;
  propertyCount?: number;
  areas?: Area[];
};

export type AdminExperience = {
  id: string;
  slug: string;
  title: string;
  cityId: string | null;
  cityName?: string | null;
  propertyId: string | null;
  propertyName?: string | null;
  shortDescription: string | null;
  story: string | null;
  location: string | null;
  meetingPoint: string | null;
  lat: number | null;
  lng: number | null;
  durationMinutes: number | null;
  price: number | null;
  suitableFor: string[];
  included: string[];
  excluded: string[];
  hostName: string | null;
  hostInfo: string | null;
  availabilityNote: string | null;
  isBookable: boolean;
  isActive: boolean;
  coverImageUrl: string | null;
  previewVideoUrl?: string | null;
  sort: number;
  seo: Seo | null;
};

export type AdminCollection = CollectionCard & {
  cityId: string | null;
  sort: number;
  isActive: boolean;
  seo: Seo | null;
  propertyIds?: string[];
  properties?: { id: string; name: string; cityName: string | null }[];
};

export type AdminAmenity = Amenity & { sort?: number };

export type ReviewStatus = "PENDING" | "PUBLISHED" | "HIDDEN";
export type AdminReview = Review & {
  status: ReviewStatus;
  propertyId: string;
  propertyName?: string | null;
  bookingCode?: string | null;
  authorEmail?: string | null;
};
/** partner review rows (GET /partner/reviews) */
export type PartnerReview = Review & { propertyId?: string; propertyName?: string | null; status?: ReviewStatus };

export type Coupon = {
  id: string;
  code: string;
  description: string | null;
  type: "PERCENT" | "FLAT";
  value: number; // bps for PERCENT, paise for FLAT
  maxDiscount: number | null;
  minBookingAmount: number;
  validFrom: string | null;
  validTo: string | null;
  usageLimit: number | null;
  perUserLimit: number;
  usedCount: number;
  propertyId: string | null;
  propertyName?: string | null;
  fundedBy: "PLATFORM" | "PARTNER";
  isActive: boolean;
  createdAt?: string;
};

export type AdminUserRow = User & {
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
  partnerId?: string | null;
  partnerName?: string | null;
};

export type TaxSettings = {
  roomGstSlabs: { upToPerNight: number | null; rateBps: number }[];
  commissionGstBps: number;
  tcsBps: number;
  tdsBps: number;
};
export type BookingSettings = { holdMinutes: number; maxRoomsPerBooking: number; maxNights: number };
export type SupportSettings = { phone: string; email: string; whatsapp: string; social: Record<string, string> };

export type AuditLog = {
  id: string;
  actorUserId: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  actorRole: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  data: unknown;
  ip: string | null;
  createdAt: string;
};

export type AdminPayment = {
  id: string;
  bookingId?: string;
  bookingCode?: string;
  provider: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  amount: number;
  status: string;
  method: string | null;
  errorDescription?: string | null;
  createdAt: string;
};
export type AdminRefund = {
  id: string;
  bookingId?: string;
  bookingCode?: string;
  amount: number;
  providerRefundId: string | null;
  status: string;
  reason: string | null;
  createdAt: string;
};

export type AdminBookingDetail = BookingDetail & {
  partnerId?: string;
  partnerName?: string;
  payments?: AdminPayment[];
  refunds?: AdminRefund[];
  ledger?: LedgerEntry[];
  channelLogs?: ChannelSyncLog[];
};

export type PartnerChannelInfo = {
  connection: ChannelConnection | null;
  roomTypes: { id: string; name: string; status: RoomTypeStatus; ratePlans: Pick<RatePlan, "id" | "name">[] }[];
};

export type LedgerPage = Paginated<LedgerEntry> & { balance: number };

export type PartnerStaffUser = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
  isActive: boolean;
  permissions: string[];
};

// DTOs returned by the BookMeStays API. Contract: /docs/API_CONTRACT.md
// Money = integer paise. Percent-like values = basis points. Stay dates = "YYYY-MM-DD".

export type Role = "SUPER_ADMIN" | "ADMIN_STAFF" | "PARTNER_OWNER" | "PARTNER_STAFF" | "CUSTOMER";
export type PropertyType = "HOTEL" | "VILLA" | "FARMHOUSE" | "HOMESTAY" | "HERITAGE";
export type TravelTag = "CORPORATE" | "FAMILY" | "COUPLES" | "FRIENDS";
export type PropertyStatus = "DRAFT" | "PENDING_REVIEW" | "LIVE" | "REJECTED" | "SUSPENDED";
export type RoomTypeStatus = "PENDING_APPROVAL" | "ACTIVE" | "INACTIVE";
export type MealPlan = "EP" | "CP" | "MAP" | "AP";
export type CommissionType = "PERCENT" | "FLAT";
export type SettlementCycle = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "AFTER_CHECKOUT";
export type KycStatus = "PENDING" | "SUBMITTED" | "VERIFIED" | "REJECTED";
export type MediaOwnerType = "PROPERTY" | "ROOM_TYPE" | "NEARBY_PLACE" | "EXPERIENCE" | "CITY" | "COLLECTION" | "BANNER";
export type MediaKind = "IMAGE" | "VIDEO";
export type MediaTag =
  | "EXTERIOR" | "ROOM_WALKTHROUGH" | "ROOM" | "BATHROOM" | "VIEW" | "COMMON_AREA"
  | "POOL" | "DINING" | "SURROUNDINGS" | "EXPERIENCE" | "AMENITY" | "OTHER";
export type BookingStatus =
  | "PENDING_PAYMENT" | "CONFIRMED" | "CHECKED_IN" | "COMPLETED" | "CANCELLED" | "NO_SHOW" | "EXPIRED";
export type SettlementStatus = "PENDING" | "APPROVED" | "PROCESSING" | "PAID" | "FAILED" | "ON_HOLD";
export type ChannelProvider = "AXISROOMS" | "EZEE" | "STAAH" | "SITEMINDER";
export type ChannelConnectionStatus = "PENDING" | "ACTIVE" | "DISABLED" | "ERROR";
export type HomeSectionType =
  | "RECOMMENDED" | "PROPERTY_TYPES" | "FEATURED" | "VIDEO_DISCOVERY" | "EXPERIENCES"
  | "CITIES" | "COLLECTIONS" | "CITY_SPOTLIGHT" | "WHY_BOOKMESTAYS";

export type Paginated<T> = { items: T[]; total: number; page: number; limit: number; totalPages: number };
export type Seo = { title?: string; description?: string; keywords?: string[]; ogImage?: string };
export type CancellationPolicy = { summary: string; rules: { hoursBeforeCheckIn: number; refundPercent: number }[] };

// ─── Auth ─────────────────────────────────────────────────────────────────────
export type User = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
  avatarUrl: string | null;
  mustChangePassword: boolean;
};
export type AuthResponse = { user: User; partnerId: string | null; accessToken: string };
export type MeResponse = { user: User; partnerId: string | null; permissions: string[] };

// ─── Catalog ──────────────────────────────────────────────────────────────────
export type Media = {
  id: string;
  ownerType: MediaOwnerType;
  ownerId: string | null;
  kind: MediaKind;
  url: string;
  posterUrl: string | null;
  hlsUrl: string | null;
  title: string | null;
  caption: string | null;
  tag: MediaTag;
  durationSec: number | null;
  width: number | null;
  height: number | null;
  sort: number;
  isCover: boolean;
};
export type Amenity = { id: string; code: string; name: string; icon: string | null; category: string; scope: "PROPERTY" | "ROOM" | "BOTH" };
export type CityLite = { id: string; name: string; slug: string; state: string | null };
export type CityCard = CityLite & { coverImageUrl: string | null; intro: string | null; propertyCount: number; isFeatured: boolean };
export type Area = { id: string; cityId: string; name: string; slug: string; description: string | null; isRecommended: boolean };

export type PropertyCard = {
  id: string;
  slug: string;
  name: string;
  type: PropertyType;
  travelTags: TravelTag[];
  cityName: string | null;
  citySlug: string | null;
  areaName: string | null;
  starRating: number | null;
  ratingAvg: number;
  ratingCount: number;
  price: number | null; // starting (or cheapest available for searched dates) nightly price, paise
  coverImageUrl: string | null;
  previewVideoUrl: string | null;
  previewVideoPosterUrl: string | null;
  highlights: string[];
  amenities: { code: string; name: string; icon: string | null }[]; // top 4
  lat: number | null;
  lng: number | null;
};

export type NearbyPlace = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  distanceKm: number | null;
  lat: number | null;
  lng: number | null;
  media: Media[];
};

export type RatePlan = {
  id: string;
  roomTypeId: string;
  name: string;
  mealPlan: MealPlan;
  inclusions: string[];
  isRefundable: boolean;
  cancellationPolicy: CancellationPolicy | null;
  basePrice: number;
  extraAdultPrice: number;
  extraChildPrice: number;
  isActive: boolean;
  sort: number;
};

export type RoomType = {
  id: string;
  propertyId: string;
  name: string;
  description: string | null;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  bedConfig: string | null;
  sizeSqft: number | null;
  viewType: string | null;
  totalRooms: number;
  basePrice: number;
  status: RoomTypeStatus;
  sort: number;
  amenities: Amenity[];
  media: Media[];
  ratePlans: RatePlan[];
};

export type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  authorName: string;
  stayMonth: string | null; // "2026-08"
  partnerReply: string | null;
  createdAt: string;
};

export type PropertyDetail = Omit<PropertyCard, "amenities"> & {
  shortDescription: string | null;
  description: string | null;
  foodAndDining: string | null;
  address: string | null;
  pincode: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  cancellationPolicy: CancellationPolicy | null;
  houseRules: string[];
  terms: string | null;
  city: CityLite | null;
  area: Area | null;
  amenities: Amenity[];
  media: Media[]; // property-level images + videos, sorted
  roomTypes: RoomType[]; // ACTIVE only on public API
  nearby: NearbyPlace[];
  experiences: ExperienceCard[];
  reviewSummary: { avg: number; count: number; distribution: Record<"1" | "2" | "3" | "4" | "5", number> };
  topReviews: Review[];
  seo: Seo | null;
  channelManaged: boolean;
};

export type ExperienceCard = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  cityName: string | null;
  citySlug: string | null;
  durationMinutes: number | null;
  price: number | null;
  coverImageUrl: string | null;
  previewVideoUrl: string | null;
  ratingAvg: number;
  ratingCount: number;
  isBookable: boolean;
};
export type ExperienceDetail = ExperienceCard & {
  story: string | null;
  location: string | null;
  meetingPoint: string | null;
  lat: number | null;
  lng: number | null;
  suitableFor: string[];
  included: string[];
  excluded: string[];
  hostName: string | null;
  hostInfo: string | null;
  availabilityNote: string | null;
  media: Media[];
  property: PropertyCard | null;
  relatedStays: PropertyCard[];
  seo: Seo | null;
};

export type CollectionCard = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  citySlug: string | null;
  propertyCount: number;
};

export type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  videoUrl: string | null;
  hlsUrl: string | null;
  posterUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  propertySlug: string | null;
};

export type VideoFeedItem = { media: Media; property: PropertyCard };

export type HomeSection =
  | { id: string; type: "RECOMMENDED" | "FEATURED"; title: string; subtitle: string | null; items: PropertyCard[] }
  | { id: string; type: "PROPERTY_TYPES"; title: string; subtitle: string | null; items: { type: PropertyType; label: string; count: number; imageUrl: string | null }[] }
  | { id: string; type: "VIDEO_DISCOVERY"; title: string; subtitle: string | null; items: VideoFeedItem[] }
  | { id: string; type: "EXPERIENCES"; title: string; subtitle: string | null; items: ExperienceCard[] }
  | { id: string; type: "CITIES"; title: string; subtitle: string | null; items: CityCard[] }
  | { id: string; type: "COLLECTIONS"; title: string; subtitle: string | null; items: CollectionCard[] }
  | { id: string; type: "CITY_SPOTLIGHT"; title: string; subtitle: string | null; city: CityCard | null; areas: Area[]; items: PropertyCard[]; experiences: ExperienceCard[] }
  | { id: string; type: "WHY_BOOKMESTAYS"; title: string; subtitle: string | null; items: [] };

export type HomePayload = { banners: Banner[]; sections: HomeSection[] };

export type SiteMeta = {
  cities: CityLite[];
  propertyTypes: { value: PropertyType; label: string }[];
  travelTags: { value: TravelTag; label: string }[];
  amenities: Amenity[];
  support: { phone: string; email: string; whatsapp: string; social: Record<string, string> };
};

export type CityPage = {
  city: CityCard & { travelInfo: string | null; foodGuide: string | null; lat: number | null; lng: number | null; seo: Seo | null };
  areas: Area[];
  featured: PropertyCard[];
  byType: { type: PropertyType; label: string; count: number; items: PropertyCard[] }[];
  collections: CollectionCard[];
  experiences: ExperienceCard[];
  videos: VideoFeedItem[];
};

// ─── Availability & booking ───────────────────────────────────────────────────
export type RatePlanAvailability = {
  ratePlanId: string;
  name: string;
  mealPlan: MealPlan;
  inclusions: string[];
  isRefundable: boolean;
  cancellationPolicy: CancellationPolicy;
  nightly: { date: string; price: number }[]; // per room, for requested occupancy
  totalPrice: number; // per room for the whole stay, before tax
  avgNightly: number;
  taxesPerRoom: number;
  available: number; // rooms available for every night
  bookable: boolean;
  reason?: string; // e.g. "Minimum stay 2 nights", "Sold out"
};
export type AvailabilityResponse = {
  checkIn: string;
  checkOut: string;
  nights: number;
  roomTypes: (Omit<RoomType, "ratePlans" | "status" | "totalRooms"> & { available: number; ratePlans: RatePlanAvailability[] })[];
};

export type BookingInput = {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms: { roomTypeId: string; ratePlanId: string; quantity: number }[];
  couponCode?: string;
};

export type PriceQuote = {
  nights: number;
  lines: {
    roomTypeId: string;
    ratePlanId: string;
    roomTypeName: string;
    ratePlanName: string;
    quantity: number;
    nightly: { date: string; price: number }[];
    amount: number;
  }[];
  roomAmount: number;
  roomTax: number;
  addonsAmount: number;
  discountAmount: number;
  totalAmount: number;
  coupon: { code: string; discount: number } | null;
  couponError?: string;
  cancellationPolicy: CancellationPolicy;
  terms: string | null;
};

export type PaymentOrder = {
  provider: "RAZORPAY";
  keyId: string;
  orderId: string;
  amount: number;
  currency: "INR";
  holdExpiresAt: string;
  prefill: { name: string; email: string; contact: string };
};

export type BookingSummary = {
  id: string;
  code: string;
  status: BookingStatus;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  guestName: string;
  totalAmount: number;
  property: { id: string; name: string; slug: string; cityName: string | null; coverImageUrl: string | null };
  roomsLabel: string; // "2 × Deluxe Room"
  createdAt: string;
};

export type BookingDetail = BookingSummary & {
  guestEmail: string;
  guestPhone: string;
  specialRequests: string | null;
  rooms: {
    roomTypeName: string;
    ratePlanName: string;
    quantity: number;
    nightlyPrices: { date: string; price: number }[];
    amount: number;
  }[];
  roomAmount: number;
  roomTax: number;
  addonsAmount: number;
  discountAmount: number;
  refundAmount: number;
  cancellationPolicy: CancellationPolicy | null;
  terms: string | null;
  holdExpiresAt: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  property: BookingSummary["property"] & { address: string | null; checkInTime: string | null; checkOutTime: string | null; contactPhone: string | null; lat: number | null; lng: number | null };
  // partner/admin only
  commissionAmount?: number;
  commissionTax?: number;
  tcsAmount?: number;
  tdsAmount?: number;
  partnerPayout?: number;
  settlementDueDate?: string | null;
  canReview?: boolean;
};

// ─── Partner / admin ──────────────────────────────────────────────────────────
export type PartnerSummary = {
  id: string;
  displayName: string;
  legalName: string;
  contactName: string;
  email: string;
  phone: string;
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
  kycStatus: KycStatus;
  settlementCycle: SettlementCycle;
  defaultCommissionType: CommissionType;
  defaultCommissionValue: number;
  propertyCount: number;
  createdAt: string;
};

export type PartnerDetail = PartnerSummary & {
  address: string | null;
  gstin: string | null;
  pan: string | null;
  bankAccountName: string | null;
  bankAccountLast4: string | null;
  bankIfsc: string | null;
  kycNotes: string | null;
  razorpayLinkedAccountId: string | null;
  settlementDayOfWeek: number | null;
  settlementDayOfMonth: number | null;
  settlementDelayDays: number;
  defaultCancellationPolicy: CancellationPolicy | null;
  defaultTerms: string | null;
  users: { id: string; name: string | null; email: string | null; phone: string | null; role: Role; isActive: boolean; permissions: string[] }[];
  properties: AdminPropertyRow[];
  commissionRules: CommissionRule[];
};

export type PartnerProfile = Omit<PartnerDetail, "users" | "properties" | "razorpayLinkedAccountId">;

export type CreatePartnerInput = {
  legalName: string;
  displayName: string;
  contactName: string;
  email: string;
  phone: string;
  address?: string;
  gstin?: string;
  pan?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  settlementCycle: SettlementCycle;
  settlementDayOfWeek?: number;
  settlementDayOfMonth?: number;
  settlementDelayDays: number;
  defaultCommissionType: CommissionType;
  defaultCommissionValue: number;
  defaultCancellationPolicy?: CancellationPolicy;
  defaultTerms?: string;
  // optional first property shell
  property?: { name: string; type: PropertyType; cityId: string };
  // optional per-room-category commission presets (applied when matching room types are approved)
  sendWelcomeEmail?: boolean;
};

export type CommissionRule = {
  id: string;
  partnerId: string;
  propertyId: string | null;
  propertyName: string | null;
  roomTypeId: string | null;
  roomTypeName: string | null;
  type: CommissionType;
  value: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  notes: string | null;
  createdAt: string;
};

export type AdminPropertyRow = {
  id: string;
  slug: string;
  name: string;
  type: PropertyType;
  status: PropertyStatus;
  partnerId: string;
  partnerName: string;
  cityName: string | null;
  coverImageUrl: string | null;
  startingPrice: number | null;
  roomTypeCount: number;
  pendingRoomTypes: number;
  isFeatured: boolean;
  isRecommended: boolean;
  curationRank: number;
  completedBookings: number; // stays that finished
  cancelledBookings: number; // cancelled + no-show
  popularityScore: number; // completedBookings − 0.5 × cancelledBookings
  channelManaged: boolean;
  updatedAt: string;
};

export type PartnerPropertyRow = Omit<AdminPropertyRow, "partnerId" | "partnerName" | "isFeatured" | "isRecommended"> & {
  reviewNotes: string | null;
};

export type PartnerPropertyDetail = Omit<PropertyDetail, "roomTypes" | "experiences" | "topReviews" | "reviewSummary"> & {
  partnerId: string;
  status: PropertyStatus;
  reviewNotes: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  cityId: string | null;
  areaId: string | null;
  isFeatured: boolean;
  isRecommended: boolean;
  curationRank: number;
  roomTypes: RoomType[]; // all statuses
};

export type CalendarDay = { date: string; total: number; sold: number; held: number; blocked: number; available: number; stopSell: boolean };
export type RateDay = { date: string; price: number; minStay: number; maxStay: number | null; closedToArrival: boolean; closedToDeparture: boolean; stopSell: boolean };
export type CalendarResponse = {
  from: string;
  to: string;
  channelManaged: boolean;
  roomTypes: { id: string; name: string; totalRooms: number; days: CalendarDay[]; ratePlans: { id: string; name: string; days: RateDay[] }[] }[];
};

export type LedgerEntry = {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  bookingCode: string | null;
  settlementId: string | null;
  createdAt: string;
};

export type Settlement = {
  id: string;
  partnerId: string;
  partnerName: string;
  periodStart: string;
  periodEnd: string;
  scheduledFor: string;
  bookingsCount: number;
  grossAmount: number;
  commissionAmount: number;
  commissionTax: number;
  tcsAmount: number;
  tdsAmount: number;
  refundAdjustments: number;
  otherAdjustments: number;
  netPayable: number;
  status: SettlementStatus;
  method: string | null;
  utr: string | null;
  paidAt: string | null;
  createdAt: string;
};
export type SettlementDetail = Settlement & { bookings: BookingSummary[]; ledger: LedgerEntry[] };

export type AdminDashboard = {
  totals: {
    gmvToday: number;
    gmvMonth: number;
    commissionMonth: number;
    bookingsToday: number;
    bookingsMonth: number;
    pendingPayouts: number;
    livePartners: number;
    liveProperties: number;
  };
  pendingApprovals: { properties: number; roomTypes: number; kyc: number; reviews: number };
  recentBookings: BookingSummary[];
  dailyGmv: { date: string; gmv: number; bookings: number }[]; // last 30 days
  channelHealth: { provider: ChannelProvider; active: number; errors24h: number }[];
};

export type PartnerDashboard = {
  arrivalsToday: BookingSummary[];
  departuresToday: BookingSummary[];
  inHouse: number;
  upcomingCount: number;
  revenueMonth: number; // partner payout basis
  bookingsMonth: number;
  occupancyNext30: number; // 0..1
  nextSettlement: { scheduledFor: string; estimatedAmount: number } | null;
  properties: PartnerPropertyRow[];
  dailyRevenue: { date: string; revenue: number; bookings: number }[];
};

export type ChannelProviderInfo = {
  provider: ChannelProvider;
  label: string;
  inboundConfigured: boolean;
  outboundConfigured: boolean;
  inboundEndpoint: string; // e.g. https://api.bookmestays.com/channel/staah/ota
};
export type ChannelConnection = {
  id: string;
  propertyId: string;
  propertyName?: string;
  provider: ChannelProvider;
  cmPropertyCode: string;
  status: ChannelConnectionStatus;
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  lastError: string | null;
  activatedAt: string | null;
  mappings: { id: string; roomTypeId: string; ratePlanId: string | null; cmRoomCode: string; cmRateCode: string | null }[];
};
export type ChannelSyncLog = {
  id: string;
  connectionId: string | null;
  provider: ChannelProvider;
  direction: "INBOUND" | "OUTBOUND";
  messageType: string;
  bookingCode: string | null;
  status: "PENDING" | "SUCCESS" | "FAILED" | "RETRYING";
  error: string | null;
  attempts: number;
  requestPayload: string | null;
  responsePayload: string | null;
  createdAt: string;
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  HOTEL: "Hotels",
  VILLA: "Villas",
  FARMHOUSE: "Farmhouses",
  HOMESTAY: "Homestays",
  HERITAGE: "Heritage Stays",
};
export const TRAVEL_TAG_LABELS: Record<TravelTag, string> = {
  CORPORATE: "Corporate",
  FAMILY: "Family",
  COUPLES: "Couples",
  FRIENDS: "Friends",
};
export const MEAL_PLAN_LABELS: Record<MealPlan, string> = {
  EP: "Room only",
  CP: "Breakfast included",
  MAP: "Breakfast + 1 meal",
  AP: "All meals",
};
export const CHANNEL_PROVIDER_LABELS: Record<ChannelProvider, string> = {
  AXISROOMS: "AxisRooms",
  EZEE: "eZee Centrix",
  STAAH: "STAAH",
  SITEMINDER: "SiteMinder",
};

// ─── Booking modification (change dates / guests / rooms) ─────────────────────
export type ModificationAction = "PAY" | "REFUND" | "NONE";
export type ModifyInput = Omit<BookingInput, "propertyId" | "couponCode">;
export type ModificationQuote = PriceQuote & { currentTotal: number; difference: number; action: ModificationAction };
export type BookingModification = {
  id: string;
  status: "PENDING_PAYMENT" | "APPLIED" | "CANCELLED" | "EXPIRED";
  requestedBy: "GUEST" | "ADMIN";
  from: { checkIn: string; checkOut: string; adults: number; children: number; totalAmount: number };
  to: {
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    totalAmount: number;
    rooms: { roomTypeName: string; ratePlanName: string; quantity: number; amount: number }[];
  };
  difference: number; // new total − old total (paise)
  action: ModificationAction;
  waived: boolean;
  reason: string | null;
  holdExpiresAt: string | null;
  appliedAt: string | null;
  createdAt: string;
  payment: PaymentOrder | null; // set while PENDING_PAYMENT
};
export type ModificationsResponse = { canModify: boolean; reason?: string; items: BookingModification[] };
export type ModifyResponse = { booking: BookingDetail; modification: BookingModification; payment: PaymentOrder | null };

/** How "Recommended" lists are ordered (Admin → Settings). */
export type RankingSettings = { mode: "MOST_BOOKED_FIRST" | "PINS_FIRST" };

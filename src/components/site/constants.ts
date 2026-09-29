// Plain (non-client) constants/helpers shared by server and client components.
import type { MediaTag, PropertyCard } from "@/lib/types";

export const TYPE_SINGULAR: Record<PropertyCard["type"], string> = {
  HOTEL: "Hotel",
  VILLA: "Villa",
  FARMHOUSE: "Farmhouse",
  HOMESTAY: "Homestay",
  HERITAGE: "Heritage Stay",
};

export const locationLine = (p: Pick<PropertyCard, "areaName" | "cityName">) => [p.areaName, p.cityName].filter(Boolean).join(", ");

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
  OTHER: "Video tour",
};

export const formatDuration = (min: number | null) => {
  if (!min) return null;
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} hr ${m} min` : `${h} hr${h > 1 ? "s" : ""}`;
};

/** Standard widths for horizontal row items (keeps card sizes consistent everywhere). */
export const rowItem = {
  poster: "w-[46%] shrink-0 snap-start sm:w-[31%] md:w-[23%] lg:w-[calc((100%-4rem)/5)]",
  wide: "w-[82%] shrink-0 snap-start sm:w-[46%] md:w-[31%] lg:w-[calc((100%-3rem)/4)]",
  video: "w-[82%] shrink-0 snap-start sm:w-[46%] lg:w-[calc((100%-2rem)/3)]",
  tile: "w-[40%] shrink-0 snap-start sm:w-[28%] md:w-[20%] lg:w-[calc((100%-5rem)/6)]",
};

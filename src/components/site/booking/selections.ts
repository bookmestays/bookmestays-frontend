// Plain module (usable from server pages): room selections in the checkout URL.
export type Selection = { roomTypeId: string; ratePlanId: string; quantity: number };

/** Encodes selections for the checkout URL: roomTypeId:ratePlanId:qty,… */
export const encodeSelections = (s: Selection[]) => s.map((x) => `${x.roomTypeId}:${x.ratePlanId}:${x.quantity}`).join(",");

export const decodeSelections = (raw: string | null | undefined): Selection[] =>
  (raw ?? "")
    .split(",")
    .map((part) => part.split(":"))
    .filter((p) => p.length === 3 && p[0] && p[1] && Number(p[2]) > 0)
    .map(([roomTypeId, ratePlanId, q]) => ({ roomTypeId, ratePlanId, quantity: Math.min(10, Math.max(1, Math.round(Number(q)))) }));

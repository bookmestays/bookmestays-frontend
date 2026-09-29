// Money from the API is always integer paise.
export const formatINR = (paise: number | null | undefined, opts: { decimals?: boolean } = {}) =>
  paise == null
    ? "—"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: opts.decimals ? 2 : 0,
        minimumFractionDigits: opts.decimals ? 2 : 0,
      }).format(paise / 100);

export const toPaise = (rupees: number | string) => Math.round(Number(rupees) * 100);
export const toRupees = (paise: number) => paise / 100;

export const formatDate = (d: string | Date, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
  new Intl.DateTimeFormat("en-IN", opts).format(typeof d === "string" ? new Date(d.length === 10 ? `${d}T00:00:00` : d) : d);

export const bpsToPercent = (bps: number) => bps / 100;
export const percentToBps = (p: number | string) => Math.round(Number(p) * 100);

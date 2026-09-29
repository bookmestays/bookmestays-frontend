"use client";

import { MapPin, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { addDays, searchHref, stayQuery, todayISO, type SearchFilters } from "@/lib/search-params";
import type { CityLite } from "@/lib/types";
import { GuestPicker, type Guests } from "./guest-picker";
import { SuggestList, useCombobox, useSuggest, type Suggestion } from "./suggest";

type Props = {
  cities: CityLite[];
  /** Current filters (search page) — non-stay filters are preserved on submit. */
  initial?: Partial<SearchFilters>;
  /** Display text for the current destination. */
  initialWhere?: string;
  variant?: "hero" | "bar";
  className?: string;
};

type Where = { city?: string; area?: string; q?: string; slug?: string };

function whereFromInitial(i?: Partial<SearchFilters>): Where {
  return { city: i?.city, area: i?.area, q: i?.q };
}

/** Where · Check-in · Check-out · Guests · Explore Stays */
export function StaySearchForm({ cities, initial, initialWhere, variant = "hero", className }: Props) {
  const router = useRouter();
  const [today] = useState(todayISO);
  const [text, setText] = useState(initialWhere ?? initial?.q ?? "");
  const [where, setWhere] = useState<Where>(() => whereFromInitial(initial));
  const [checkIn, setCheckIn] = useState(initial?.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(initial?.checkOut ?? "");
  const [guests, setGuests] = useState<Guests>({ adults: initial?.adults ?? 2, children: initial?.children ?? 0, rooms: initial?.rooms ?? 1 });
  const [error, setError] = useState<string | null>(null);

  const { items, loading, heading } = useSuggest(text, cities);

  const choose = (s: Suggestion) => {
    setError(null);
    if (s.kind === "query") {
      setWhere({ q: s.q });
      setText(s.q);
      return;
    }
    setText(s.label);
    if (s.kind === "property") setWhere({ slug: s.slug });
    else {
      setWhere({ city: s.city, area: s.kind === "area" ? s.area : undefined });
      track("destination_selected", { kind: s.kind, city: s.city, source: variant });
    }
  };
  const cb = useCombobox(items, choose, () => {});

  const submit = () => {
    if (checkIn && !checkOut) return setError("Please choose a check-out date.");
    if (checkIn && checkOut && checkOut <= checkIn) return setError("Check-out must be after check-in.");
    setError(null);
    const stay = { checkIn: checkIn || undefined, checkOut: checkOut || undefined, ...guests };
    if (where.slug) {
      router.push(`/stays/${where.slug}${stayQuery(stay)}`);
      return;
    }
    const typed = text.trim();
    const dest: Where = where.city || where.q ? where : typed ? { q: typed } : {};
    const f: Partial<SearchFilters> = {
      ...(initial ?? {}),
      city: dest.city,
      area: dest.area,
      q: dest.city ? undefined : dest.q,
      ...stay,
      page: 1,
    };
    track("search_performed", { city: f.city, q: f.q, checkIn: f.checkIn, checkOut: f.checkOut, ...guests, source: variant });
    router.push(searchHref(f));
  };

  const hero = variant === "hero";
  const seg = "flex min-w-0 flex-col justify-center px-4 py-2.5";
  const labelCls = "text-[11px] font-semibold tracking-wide text-muted uppercase";
  const inputCls = "w-full bg-transparent text-sm font-medium text-ink placeholder:font-normal placeholder:text-muted focus:outline-none";

  return (
    <form
      role="search"
      aria-label="Search stays"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={cn(
        "relative w-full rounded-[1.75rem] border border-line bg-white text-left shadow-[0_18px_40px_-24px_rgba(20,35,43,0.35)]",
        hero ? "shadow-xl" : "shadow-sm",
        className,
      )}
    >
      <div className="grid grid-cols-2 divide-line max-lg:divide-y lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)_auto] lg:divide-x lg:items-stretch">
        <div className={cn(seg, "relative col-span-2 lg:col-span-1")}>
          <label htmlFor={`where-${variant}`} className={labelCls}>
            Where
          </label>
          <div className="flex items-center gap-1.5">
            <MapPin className="size-4 shrink-0 text-muted" aria-hidden />
            <input
              id={`where-${variant}`}
              autoComplete="off"
              placeholder="City, area, property or landmark"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setWhere({});
                cb.setOpen(true);
                cb.setActive(-1);
              }}
              className={inputCls}
              {...cb.inputProps}
            />
          </div>
          {cb.open && (items.length > 0 || loading) && (
            <SuggestList id={cb.listId} items={items} active={cb.active} heading={heading} loading={loading} onSelect={(s) => { choose(s); cb.setOpen(false); }} onHover={cb.setActive} className="left-2 right-2 lg:right-auto lg:w-96" />
          )}
        </div>
        <div className={cn(seg, "max-lg:border-r max-lg:border-line")}>
          <label htmlFor={`in-${variant}`} className={labelCls}>
            Check-in
          </label>
          <input
            id={`in-${variant}`}
            type="date"
            min={today}
            value={checkIn}
            onChange={(e) => {
              const v = e.target.value;
              setCheckIn(v);
              if (v && (!checkOut || checkOut <= v)) setCheckOut(addDays(v, 1));
            }}
            className={inputCls}
          />
        </div>
        <div className={seg}>
          <label htmlFor={`out-${variant}`} className={labelCls}>
            Check-out
          </label>
          <input
            id={`out-${variant}`}
            type="date"
            min={checkIn ? addDays(checkIn, 1) : today}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className={cn(seg, "col-span-2 lg:col-span-1")}>
          <GuestPicker value={guests} onChange={setGuests} />
        </div>
        <div className="col-span-2 p-2 lg:col-span-1 lg:flex lg:items-center">
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent px-7 text-base font-semibold text-white shadow-sm shadow-accent/30 transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:w-auto"
          >
            <Search className="size-5" aria-hidden />
            {hero ? "Explore Stays" : "Search"}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="px-4 pb-3 text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

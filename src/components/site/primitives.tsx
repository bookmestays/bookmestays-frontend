import { ChevronRight, Star } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/format";

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

export { Logo, LogoMark } from "./brand/logo";

export function RatingBadge({ value, count, className, size = "sm" }: { value: number; count?: number; className?: string; size?: "sm" | "md" }) {
  if (!value || (count !== undefined && count === 0)) {
    return <span className={cn("text-xs font-medium text-muted", className)}>New</span>;
  }
  return (
    <span className={cn("inline-flex items-center gap-1", size === "md" ? "text-sm" : "text-xs", className)}>
      <span className="inline-flex items-center gap-1 rounded-full bg-rating/15 px-2 py-0.5 font-semibold text-ink">
        <Star className="size-3 fill-rating text-rating" aria-hidden />
        {value.toFixed(1)}
      </span>
      {count !== undefined && <span className="text-muted">({count.toLocaleString("en-IN")})</span>}
      <span className="sr-only">
        Rated {value.toFixed(1)} out of 5{count !== undefined ? ` from ${count} reviews` : ""}
      </span>
    </span>
  );
}

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-rating", className)} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("size-3.5", i <= Math.round(value) ? "fill-current" : "text-line")} aria-hidden />
      ))}
    </span>
  );
}

export function PriceTag({ paise, suffix = "/night", prefix = "From", className }: { paise: number | null; suffix?: string; prefix?: string; className?: string }) {
  if (paise == null) return <span className={cn("text-sm text-muted", className)}>Price on request</span>;
  return (
    <span className={cn("text-sm text-muted", className)}>
      {prefix && <span className="text-xs">{prefix} </span>}
      <span className="text-base font-bold text-ink">{formatINR(paise)}</span>
      {suffix && <span className="text-xs"> {suffix}</span>}
    </span>
  );
}

export function SectionHeading({
  title,
  subtitle,
  href,
  hrefLabel = "See All",
  className,
  as: As = "h2",
}: {
  title: string;
  subtitle?: string | null;
  href?: string;
  hrefLabel?: string;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <As className="text-xl font-bold text-ink sm:text-2xl">{title}</As>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center text-sm font-medium text-brand hover:underline">
          {hrefLabel}
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/** Light-grey band (BookMyShow style) or plain white section. */
export function Band({ tone = "white", className, children, id }: { tone?: "white" | "grey"; className?: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className={cn("py-8 sm:py-10", tone === "grey" && "bg-surface-2", className)}>
      {children}
    </section>
  );
}

export function Breadcrumbs({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-muted sm:text-sm">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5" aria-hidden />}
            {it.href && i < items.length - 1 ? (
              <Link href={it.href} className="hover:text-ink hover:underline">
                {it.name}
              </Link>
            ) : (
              <span aria-current={i === items.length - 1 ? "page" : undefined} className="text-ink-2">
                {it.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** JSON-LD script (escaped per Next.js guide). */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function PageHeader({ title, subtitle, children, className }: { title: string; subtitle?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={cn("border-b border-line bg-surface-2", className)}>
      <Container className="py-8 sm:py-10">
        {children}
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-3xl text-sm text-ink-2 sm:text-base">{subtitle}</p>}
      </Container>
    </div>
  );
}

/** Renders plain text with paragraphs preserved. */
export function Prose({ text, className }: { text: string | null | undefined; className?: string }) {
  if (!text) return null;
  return (
    <div className={cn("space-y-3 text-sm leading-relaxed text-ink-2 sm:text-base", className)}>
      {text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className="whitespace-pre-line">
            {p}
          </p>
        ))}
    </div>
  );
}

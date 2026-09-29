/* eslint-disable @next/next/no-img-element -- arbitrary storage hosts */
import { Building2 } from "lucide-react";

export function PropertyThumb({ url, name }: { url: string | null; name: string }) {
  return url ? (
    <img src={url} alt="" className="size-10 shrink-0 rounded-md object-cover" loading="lazy" />
  ) : (
    <span className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-2 text-muted" aria-label={`${name} has no cover`}>
      <Building2 className="size-4" />
    </span>
  );
}

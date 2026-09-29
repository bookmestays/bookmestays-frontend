import { Badge } from "@/components/ui";
import { humanize, STATUS_MAPS } from "./labels";

type Kind = keyof typeof STATUS_MAPS;

/** Renders a coloured badge for any known status enum. Unknown values fall back to a neutral badge. */
export function StatusBadge({ kind, status, className }: { kind: Kind; status: string | null | undefined; className?: string }) {
  if (!status) return null;
  const map = STATUS_MAPS[kind] as Record<string, { label: string; tone: Parameters<typeof Badge>[0]["tone"] }>;
  const s = map[status] ?? { label: humanize(status), tone: "neutral" as const };
  return (
    <Badge tone={s.tone} className={className}>
      {s.label}
    </Badge>
  );
}

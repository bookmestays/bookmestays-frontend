import type { ReactNode } from "react";
import { Container, PageHeader } from "./primitives";

export type StaticSection = { id?: string; title: string; body: ReactNode };

/** Simple content page used for About / Help / policy pages. */
export function StaticPage({ title, subtitle, updated, sections, aside }: { title: string; subtitle?: string; updated?: string; sections: StaticSection[]; aside?: ReactNode }) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <Container className="py-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
          <article className="max-w-3xl space-y-8">
            {updated && <p className="text-xs text-muted">Last updated: {updated}</p>}
            {sections.map((s) => (
              <section key={s.title} id={s.id} className="scroll-mt-6">
                <h2 className="text-lg font-semibold text-ink">{s.title}</h2>
                <div className="mt-2 space-y-3 text-sm leading-relaxed text-ink-2 [&_a]:text-brand [&_a]:underline [&_li]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1">{s.body}</div>
              </section>
            ))}
          </article>
          {aside && <aside className="lg:sticky lg:top-4 lg:self-start">{aside}</aside>}
        </div>
      </Container>
    </>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import {
  Bold,
  CheckCircle2,
  Circle,
  ExternalLink,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Table,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/use-api";
import { refreshBlogPages } from "@/lib/blog-actions";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { AdminBlogPost, Seo } from "@/lib/types";
import { Badge, Button, Field, Input, Select, Textarea, useToast } from "@/components/ui";
import { ChipsInput, Toggle } from "@/components/panel/inputs";
import { MediaUrlField } from "@/components/panel/media-field";
import { uploadFile, validateFile } from "@/components/panel/media-upload";
import { PageHeader, SaveBar, Section, Alert } from "@/components/panel/page";
import { SeoFields } from "@/components/panel/seo-fields";
import { ConfirmDialog } from "@/components/panel/confirm-dialog";
import { sameJson, useUnsavedChanges } from "@/components/panel/unsaved";
import { fromLocalInput, slugify, toLocalInput, useSiteMeta } from "@/components/panel/util";
import { usePanelAuth } from "@/components/panel/auth";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const SITE_HOST = (() => {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return null;
  }
})();

/** Absolute public URL (the admin panel may live on another subdomain). */
export const blogPostUrl = (slug: string) => `${SITE_URL}/blog/${slug}`;

const isLive = (p: Pick<AdminBlogPost, "status" | "publishedAt">) => p.status === "PUBLISHED" && !!p.publishedAt && new Date(p.publishedAt) <= new Date();

export function BlogStatusBadge({ post }: { post: Pick<AdminBlogPost, "status" | "publishedAt"> }) {
  if (post.status === "DRAFT") return <Badge>Draft</Badge>;
  if (!isLive(post)) return <Badge tone="info">Scheduled</Badge>;
  return <Badge tone="success">Published</Badge>;
}

type Form = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string | null;
  coverImageAlt: string;
  category: string;
  tags: string[];
  cityId: string;
  publishedAt: string; // datetime-local
  isFeatured: boolean;
  authorName: string;
  seo: Seo;
};

const toForm = (p: AdminBlogPost | null): Form => ({
  title: p?.title ?? "",
  slug: p?.slug ?? "",
  excerpt: p?.excerpt ?? "",
  content: p?.content ?? "",
  coverImageUrl: p?.coverImageUrl ?? null,
  coverImageAlt: p?.coverImageAlt ?? "",
  category: p?.category ?? "",
  tags: p?.tags ?? [],
  cityId: p?.cityId ?? "",
  publishedAt: toLocalInput(p?.publishedAt),
  isFeatured: p?.isFeatured ?? false,
  authorName: p?.authorName ?? "",
  seo: p?.seo ?? {},
});

const plainText = (md: string) =>
  md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~|-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function BlogEditor({ post }: { post: AdminBlogPost | null }) {
  const router = useRouter();
  const toast = useToast();
  const { isBlogEditor } = usePanelAuth();
  const meta = useSiteMeta();
  const taxonomy = useApi<{ categories: string[]; tags: string[] }>("/admin/blog/taxonomy");
  const [saved, setSaved] = useState<AdminBlogPost | null>(post);
  const [f, setF] = useState<Form>(() => toForm(post));
  const [slugTouched, setSlugTouched] = useState(!!post);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [busy, setBusy] = useState<"draft" | "publish" | "unpublish" | null>(null);
  const [touched, setTouched] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);

  const dirty = !sameJson(f, toForm(saved));
  useUnsavedChanges(dirty && !busy);
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));

  const words = useMemo(() => plainText(f.content).split(" ").filter(Boolean).length, [f.content]);
  const preview = useMemo(() => (mode === "preview" ? renderMarkdown(f.content, { siteHost: SITE_HOST }) : null), [mode, f.content]);
  const h2Count = (f.content.match(/^#{1,2}\s+\S/gm) ?? []).length;

  const titleErr = f.title.trim().length < 3 ? "Title must be at least 3 characters" : null;
  const live = saved ? isLive(saved) : false;
  const scheduled = !!f.publishedAt && new Date(f.publishedAt) > new Date();
  const slugChangedOnLive = !!saved?.publishedAt && f.slug !== saved.slug;

  // ─── Toolbar helpers ──────────────────────────────────────────────────────
  const replaceSelection = (fn: (sel: string) => { text: string; selectFrom?: number; selectTo?: number }) => {
    const el = editor.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const { text, selectFrom, selectTo } = fn(f.content.slice(start, end));
    const next = f.content.slice(0, start) + text + f.content.slice(end);
    set({ content: next });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + (selectFrom ?? text.length), start + (selectTo ?? text.length));
    });
  };
  const wrap = (mark: string, placeholder: string) =>
    replaceSelection((sel) => {
      const inner = sel || placeholder;
      return { text: `${mark}${inner}${mark}`, selectFrom: mark.length, selectTo: mark.length + inner.length };
    });
  /** Prefix each selected line (or a new line) with `prefix`. */
  const block = (prefix: string | ((i: number) => string), placeholder: string) =>
    replaceSelection((sel) => {
      const el = editor.current!;
      const atLineStart = el.selectionStart === 0 || f.content[el.selectionStart - 1] === "\n";
      const lead = atLineStart ? "" : "\n";
      const lines = (sel || placeholder).split("\n");
      const text = lines.map((l, i) => `${typeof prefix === "string" ? prefix : prefix(i)}${l}`).join("\n");
      return { text: `${lead}${text}\n`, selectFrom: lead.length, selectTo: lead.length + text.length };
    });
  const insertBlock = (snippet: string) =>
    replaceSelection(() => {
      const el = editor.current!;
      const before = f.content.slice(0, el.selectionStart);
      const lead = !before || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
      return { text: `${lead}${snippet}\n\n` };
    });

  const onImage = async (file: File) => {
    const err = validateFile(file, ["IMAGE"]);
    if (err) return toast.error(err);
    setUploading(0);
    try {
      const { url } = await uploadFile(file, { ownerType: "BLOG", ownerId: saved?.id ?? null, kind: "IMAGE", onProgress: setUploading });
      const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Image";
      insertBlock(`![${alt}](${url} "Caption (optional) — delete this text if not needed")`);
      toast.success("Image added. Edit the text in [ ] to describe the image — it helps SEO.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(null);
    }
  };

  // ─── Save ─────────────────────────────────────────────────────────────────
  const save = async (status: "DRAFT" | "PUBLISHED", kind: "draft" | "publish" | "unpublish") => {
    setTouched(true);
    if (titleErr) {
      toast.error(titleErr);
      return;
    }
    if (status === "PUBLISHED" && words < 10) {
      toast.error("Write the article content before publishing.");
      return;
    }
    setBusy(kind);
    try {
      const body = {
        title: f.title.trim(),
        slug: f.slug.trim() || undefined,
        excerpt: f.excerpt.trim() || null,
        content: f.content,
        coverImageUrl: f.coverImageUrl,
        coverImageAlt: f.coverImageAlt.trim() || null,
        category: f.category.trim() || null,
        tags: f.tags,
        cityId: f.cityId || null,
        status,
        publishedAt: f.publishedAt ? fromLocalInput(f.publishedAt) : saved ? null : undefined,
        isFeatured: f.isFeatured,
        authorName: f.authorName.trim() || null,
        seo: Object.values(f.seo).some((v) => (Array.isArray(v) ? v.length : v)) ? f.seo : null,
      };
      const res = saved
        ? await api<AdminBlogPost>(`/admin/blog/${saved.id}`, { method: "PATCH", body })
        : await api<AdminBlogPost>("/admin/blog", { method: "POST", body });
      setSaved(res);
      setF(toForm(res));
      setSlugTouched(true);
      // Refresh the public blog pages + sitemap right away (best-effort).
      await refreshBlogPages().catch(() => null);
      toast.success(
        kind === "publish"
          ? isLive(res)
            ? "Published! The post is live on the site."
            : `Scheduled for ${formatDate(res.publishedAt!, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}`
          : kind === "unpublish"
            ? "Unpublished — the post is now a draft"
            : "Saved",
      );
      if (!saved) router.replace(`/admin/blog/${res.id}`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  // ─── SEO checklist ──────────────────────────────────────────────────────
  const metaTitle = f.seo.title || f.title;
  const metaDesc = f.seo.description || f.excerpt || plainText(f.content).slice(0, 160);
  const checks = [
    { ok: metaTitle.length >= 30 && metaTitle.length <= 65, label: `Title is 30–65 characters (now ${metaTitle.length})` },
    { ok: metaDesc.length >= 70 && metaDesc.length <= 165, label: `Meta description / excerpt is 70–165 characters (now ${metaDesc.length})` },
    { ok: words >= 300, label: `At least 300 words (now ${words})` },
    { ok: h2Count >= 2, label: "Uses 2+ section headings (H2)" },
    { ok: !!f.coverImageUrl, label: "Has a cover image" },
    { ok: !f.coverImageUrl || f.coverImageAlt.trim().length > 3, label: "Cover image has alt text" },
    { ok: /\]\(\/(stays|cities|experiences|collections|blog|hotels|villas)/.test(f.content), label: "Links to a page on BookMeStays (stay, city, another post…)" },
    { ok: !!f.category.trim(), label: "Has a category" },
  ];
  const score = checks.filter((c) => c.ok).length;

  const publicUrl = blogPostUrl(f.slug || slugify(f.title) || "your-post");

  return (
    <>
      <PageHeader
        title={saved ? "Edit post" : "New blog post"}
        breadcrumbs={[{ label: "Blog", href: "/admin/blog" }, { label: saved ? saved.title : "New post" }]}
        meta={saved && <BlogStatusBadge post={saved} />}
        actions={
          saved &&
          live && (
            <a href={blogPostUrl(saved.slug)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-brand hover:underline">
              View on site <ExternalLink className="size-3.5" aria-hidden />
            </a>
          )
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ─── Main column ─── */}
        <div className="min-w-0 space-y-5">
          <Section>
            <div className="space-y-4">
              <Field label="Title" required error={touched ? titleErr : null} hint="The main headline (H1). Put the key phrase people search for near the start.">
                <Input
                  value={f.title}
                  maxLength={200}
                  placeholder="e.g. 10 Best Weekend Getaways from Delhi for 2026"
                  className="text-base font-medium"
                  onChange={(e) => set({ title: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })}
                />
              </Field>
              <Field
                label="URL slug (permalink)"
                hint={
                  <>
                    Page address: <span className="font-mono text-ink-2">{publicUrl}</span>
                  </>
                }
              >
                <Input
                  value={f.slug}
                  maxLength={200}
                  placeholder="weekend-getaways-from-delhi"
                  className="font-mono text-sm"
                  onChange={(e) => {
                    setSlugTouched(true);
                    set({ slug: slugify(e.target.value).slice(0, 200) || e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") });
                  }}
                />
              </Field>
              {slugChangedOnLive && (
                <Alert tone="warning">
                  This post was already published at <span className="font-mono">/blog/{saved!.slug}</span>. After saving, the old link will permanently redirect to the new one.
                </Alert>
              )}
              <Field label="Short description (excerpt)" hint={`${f.excerpt.length}/500 · Shown on blog cards and used as the Google description when no meta description is set. Aim for 120–160 characters.`}>
                <Textarea rows={3} maxLength={500} value={f.excerpt} onChange={(e) => set({ excerpt: e.target.value })} placeholder="One or two sentences that make people want to read the post." />
              </Field>
            </div>
          </Section>

          <Section
            title="Article"
            description={`${words} words · ~${Math.max(1, Math.round(words / 200))} min read`}
            actions={
              <div className="inline-flex rounded-full border border-line p-0.5 text-sm" role="tablist" aria-label="Editor mode">
                {(["write", "preview"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => setMode(m)}
                    className={cn("rounded-full px-3 py-1 capitalize", mode === m ? "bg-brand text-white" : "text-ink-2 hover:bg-surface-2")}
                  >
                    {m}
                  </button>
                ))}
              </div>
            }
            bodyClassName="p-0 sm:p-0"
          >
            {mode === "write" ? (
              <>
                <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-surface-2 px-2 py-1.5" role="toolbar" aria-label="Formatting">
                  <ToolButton label="Heading (H2)" onClick={() => block("## ", "Section heading")}>
                    <Heading2 className="size-4" />
                  </ToolButton>
                  <ToolButton label="Sub-heading (H3)" onClick={() => block("### ", "Sub heading")}>
                    <Heading3 className="size-4" />
                  </ToolButton>
                  <Divider />
                  <ToolButton label="Bold" onClick={() => wrap("**", "bold text")}>
                    <Bold className="size-4" />
                  </ToolButton>
                  <ToolButton label="Italic" onClick={() => wrap("*", "italic text")}>
                    <Italic className="size-4" />
                  </ToolButton>
                  <ToolButton
                    label="Link"
                    onClick={() =>
                      replaceSelection((sel) => {
                        const label = sel || "link text";
                        const text = `[${label}](https://)`;
                        return { text, selectFrom: label.length + 3, selectTo: text.length - 1 };
                      })
                    }
                  >
                    <Link2 className="size-4" />
                  </ToolButton>
                  <Divider />
                  <ToolButton label="Bullet list" onClick={() => block("- ", "List item")}>
                    <List className="size-4" />
                  </ToolButton>
                  <ToolButton label="Numbered list" onClick={() => block((i) => `${i + 1}. `, "List item")}>
                    <ListOrdered className="size-4" />
                  </ToolButton>
                  <ToolButton label="Quote" onClick={() => block("> ", "Quote")}>
                    <Quote className="size-4" />
                  </ToolButton>
                  <ToolButton label="Table" onClick={() => insertBlock("| Column 1 | Column 2 |\n|---|---|\n| Value | Value |")}>
                    <Table className="size-4" />
                  </ToolButton>
                  <ToolButton label="Divider line" onClick={() => insertBlock("---")}>
                    <Minus className="size-4" />
                  </ToolButton>
                  <Divider />
                  <button
                    type="button"
                    onClick={() => imageInput.current?.click()}
                    disabled={uploading !== null}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-ink-2 hover:bg-white hover:text-ink disabled:opacity-50"
                  >
                    <ImagePlus className="size-4" aria-hidden />
                    {uploading !== null ? `Uploading ${Math.round(uploading * 100)}%` : "Insert image"}
                  </button>
                  <input
                    ref={imageInput}
                    type="file"
                    className="sr-only"
                    aria-label="Upload image into the article"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onImage(file);
                      e.target.value = "";
                    }}
                  />
                </div>
                <textarea
                  ref={editor}
                  aria-label="Article content"
                  value={f.content}
                  onChange={(e) => set({ content: e.target.value })}
                  placeholder={"Start writing…\n\n## Use headings to split the article into sections\n\nWrite paragraphs separated by a blank line. Use the toolbar for **bold**, links, lists and images."}
                  className="block min-h-[520px] w-full resize-y bg-white px-4 py-3 font-mono text-[14px] leading-relaxed text-ink outline-none sm:px-5"
                />
                <details className="border-t border-line px-4 py-2 text-xs text-muted sm:px-5">
                  <summary className="cursor-pointer select-none py-1 text-ink-2">Formatting help</summary>
                  <ul className="grid gap-1 py-2 sm:grid-cols-2">
                    <li><code>## Heading</code> → section heading</li>
                    <li><code>### Sub heading</code> → smaller heading</li>
                    <li><code>**bold**</code>, <code>*italic*</code></li>
                    <li><code>[text](https://…)</code> → link; use <code>/stays/…</code> for our pages</li>
                    <li><code>- item</code> → bullet list, <code>1. item</code> → numbered</li>
                    <li><code>&gt; text</code> → highlighted quote</li>
                    <li><code>![description](image-url &quot;caption&quot;)</code> → image</li>
                    <li>Blank line = new paragraph; single Enter = line break</li>
                  </ul>
                </details>
              </>
            ) : (
              <div className="px-4 py-5 sm:px-8">
                {f.content.trim() ? (
                  <article className="blog-prose mx-auto max-w-3xl" dangerouslySetInnerHTML={{ __html: preview!.html }} />
                ) : (
                  <p className="py-16 text-center text-sm text-muted">Nothing to preview yet.</p>
                )}
              </div>
            )}
          </Section>

          <Section title="Search engine (SEO)" description="Optional overrides. Leave empty to use the title, excerpt and cover image.">
            <div className="mb-5 rounded-xl border border-line bg-white p-4">
              <p className="text-xs text-muted">Google preview</p>
              <p className="mt-1 truncate text-xs text-success">{publicUrl.replace(/^https?:\/\//, "")}</p>
              <p className="line-clamp-1 text-lg text-[#1a0dab]">{metaTitle || "Post title"} | BookMeStays</p>
              <p className="line-clamp-2 text-sm text-ink-2">{metaDesc || "The excerpt or meta description shows here."}</p>
            </div>
            <SeoFields seo={f.seo} onChange={(seo) => set({ seo })} ownerType="BLOG" ownerId={saved?.id ?? null} />
          </Section>
        </div>

        {/* ─── Sidebar ─── */}
        <div className="space-y-5">
          <Section title="Publish">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Status</span>
                {saved ? <BlogStatusBadge post={saved} /> : <Badge>Not saved</Badge>}
              </div>
              <Field label="Publish date & time" hint={scheduled ? "In the future → the post goes live automatically at this time." : "Leave empty to publish immediately."}>
                <Input type="datetime-local" value={f.publishedAt} onChange={(e) => set({ publishedAt: e.target.value })} />
              </Field>
              <Toggle label="Featured post" description="Shown first on the blog page" checked={f.isFeatured} onChange={(v) => set({ isFeatured: v })} />
              <div className="flex flex-col gap-2">
                <Button variant="accent" loading={busy === "publish"} disabled={!!busy} onClick={() => save("PUBLISHED", "publish")}>
                  {saved?.status === "PUBLISHED" ? "Update post" : scheduled ? "Schedule post" : "Publish now"}
                </Button>
                {saved?.status === "PUBLISHED" ? (
                  <Button variant="outline" loading={busy === "unpublish"} disabled={!!busy} onClick={() => save("DRAFT", "unpublish")}>
                    Unpublish (back to draft)
                  </Button>
                ) : (
                  <Button variant="outline" loading={busy === "draft"} disabled={!!busy} onClick={() => save("DRAFT", "draft")}>
                    Save draft
                  </Button>
                )}
              </div>
              {saved && (!isBlogEditor || !saved.publishedAt) && (
                <button type="button" onClick={() => setDeleting(true)} className="inline-flex items-center gap-1 text-sm text-danger hover:underline">
                  <Trash2 className="size-4" aria-hidden /> Delete post
                </button>
              )}
            </div>
          </Section>

          <Section title="Cover image">
            <div className="space-y-3">
              <MediaUrlField kind="IMAGE" ownerType="BLOG" ownerId={saved?.id ?? null} label="Cover (1200×630 or larger, landscape)" value={f.coverImageUrl} onChange={(u) => set({ coverImageUrl: u })} allowUrlInput={false} />
              <Field label="Alt text" hint="Describe the image for Google Images and screen readers.">
                <Input value={f.coverImageAlt} maxLength={200} onChange={(e) => set({ coverImageAlt: e.target.value })} placeholder="e.g. Sunset over Baga beach in Goa" />
              </Field>
            </div>
          </Section>

          <Section title="Organise">
            <div className="space-y-4">
              <Field label="Category" hint="Each category gets its own page on the site (/blog/category/…).">
                <Input list="blog-categories" value={f.category} maxLength={80} onChange={(e) => set({ category: e.target.value })} placeholder="e.g. Travel Guides" />
                <datalist id="blog-categories">
                  {taxonomy.data?.categories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </Field>
              <div>
                <p className="mb-1.5 text-sm font-medium text-ink">Tags</p>
                <ChipsInput ariaLabel="Tags" value={f.tags} onChange={(tags) => set({ tags: tags.slice(0, 20) })} placeholder="goa, beaches, monsoon…" />
                {!!taxonomy.data?.tags.length && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {taxonomy.data.tags
                      .filter((t) => !f.tags.includes(t))
                      .slice(0, 12)
                      .map((t) => (
                        <button key={t} type="button" onClick={() => set({ tags: [...f.tags, t].slice(0, 20) })} className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-2 hover:border-brand hover:text-brand">
                          + {t}
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <Field label="Related city" hint="Adds an “Explore stays in …” link under the article.">
                <Select value={f.cityId} onChange={(e) => set({ cityId: e.target.value })}>
                  <option value="">None</option>
                  {meta.data?.cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Author name" hint="Shown on the article. Defaults to your account name.">
                <Input value={f.authorName} maxLength={160} onChange={(e) => set({ authorName: e.target.value })} />
              </Field>
            </div>
          </Section>

          <Section title="SEO checklist" description={`${score}/${checks.length} done`}>
            <ul className="space-y-2 text-sm">
              {checks.map((c) => (
                <li key={c.label} className="flex gap-2">
                  {c.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />}
                  <span className={c.ok ? "text-ink-2" : "text-muted"}>
                    <span className="sr-only">{c.ok ? "Done: " : "To do: "}</span>
                    {c.label}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>

      <SaveBar dirty={dirty}>
        <Button variant="outline" loading={busy === "draft"} disabled={!!busy || !dirty} onClick={() => save(saved?.status ?? "DRAFT", "draft")}>
          {saved?.status === "PUBLISHED" ? "Save changes" : "Save draft"}
        </Button>
      </SaveBar>

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Delete this post?"
        description={saved?.publishedAt ? "The page will disappear from the site and Google. Consider unpublishing instead." : "This draft will be permanently deleted."}
        confirmLabel="Delete post"
        tone="danger"
        onConfirm={async () => {
          await api(`/admin/blog/${saved!.id}`, { method: "DELETE" });
          await refreshBlogPages().catch(() => null);
          toast.success("Post deleted");
          setSaved(null);
          setF(toForm(null));
          router.replace("/admin/blog");
        }}
      />
    </>
  );
}

function ToolButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} className="grid size-8 place-items-center rounded-md text-ink-2 hover:bg-white hover:text-ink">
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-line" />;
}

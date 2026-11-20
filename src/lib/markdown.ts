// Small, safe Markdown → HTML renderer for blog posts (used by the public blog page and the
// editor preview, so both look identical). Every piece of text is HTML-escaped first and only
// whitelisted tags are produced, so raw HTML / <script> typed into a post is shown as text.
//
// Supported: # / ## / ### / #### headings, paragraphs (single newline = line break), **bold**,
// *italic* / _italic_, ~~strike~~, `code`, ``` code blocks ```, [links](url), ![images](url "caption"),
// > quotes, - bullet lists, 1. numbered lists, --- rules and | pipe | tables |.

export type MarkdownHeading = { id: string; text: string; level: 2 | 3 };

const NUL = "\u0000";

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Allows http(s), mailto, tel, site-relative and #anchor URLs only. Input/output are HTML-escaped. */
function safeUrl(escapedUrl: string): string | null {
  const u = escapedUrl.trim();
  if (!u || /\s/.test(u)) return null;
  return /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(u) ? u : null;
}

export function headingId(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/[\s-]+/g, "-")
      .slice(0, 80) || "section"
  );
}

type Opts = { siteHost?: string | null };

function isExternal(url: string, siteHost?: string | null) {
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    return !siteHost || new URL(url.replace(/&amp;/g, "&")).host !== siteHost;
  } catch {
    return true;
  }
}

/** Renders inline Markdown of one block (already split into lines by the caller). */
function inline(raw: string, opts: Opts): string {
  const slots: string[] = [];
  const hold = (html: string) => `${NUL}${slots.push(html) - 1}${NUL}`;

  // 1. code spans (content kept literally)
  let s = raw.replace(/`([^`\n]+)`/g, (_, code: string) => hold(`<code>${escapeHtml(code)}</code>`));
  // 2. escape everything else
  s = escapeHtml(s);
  // 3. images, then links (held so emphasis never touches their URLs)
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;(.*?)&quot;)?\)/g, (m, alt: string, url: string, title?: string) => {
    const href = safeUrl(url);
    if (!href) return m;
    return hold(`<img src="${href}" alt="${alt}"${title ? ` title="${title}"` : ""} loading="lazy" decoding="async" />`);
  });
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;(.*?)&quot;)?\)/g, (m, text: string, url: string, title?: string) => {
    const href = safeUrl(url);
    if (!href) return m;
    const ext = isExternal(href, opts.siteHost);
    return hold(
      `<a href="${href}"${title ? ` title="${title}"` : ""}${ext ? ' target="_blank" rel="noopener noreferrer"' : ""}>${emphasis(text)}</a>`,
    );
  });
  // 4. emphasis
  s = emphasis(s);
  // 5. restore held fragments
  return s.replace(new RegExp(`${NUL}(\\d+)${NUL}`, "g"), (_, i: string) => slots[Number(i)]);
}

function emphasis(s: string) {
  return s
    .replace(/\*\*(?=\S)(.+?)(?<=\S)\*\*/g, "<strong>$1</strong>")
    .replace(/__(?=\S)(.+?)(?<=\S)__/g, "<strong>$1</strong>")
    .replace(/~~(?=\S)(.+?)(?<=\S)~~/g, "<del>$1</del>")
    .replace(/(^|[^*\w])\*(?=\S)([^*\n]+?)(?<=\S)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/(^|[^_\w])_(?=\S)([^_\n]+?)(?<=\S)_(?!\w)/g, "$1<em>$2</em>");
}

const RE = {
  fence: /^\s*```/,
  heading: /^(#{1,4})\s+(.+?)\s*#*\s*$/,
  hr: /^\s{0,3}([-*_])(\s*\1){2,}\s*$/,
  quote: /^\s{0,3}>\s?/,
  ul: /^\s{0,3}[-*+]\s+/,
  ol: /^\s{0,3}\d{1,3}[.)]\s+/,
  image: /^\s*!\[([^\]]*)\]\(([^)\s]+)(?:\s+"(.*?)")?\)\s*$/,
  tableRow: /^\s*\|.*\|\s*$/,
  tableSep: /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/,
};

const cells = (row: string) =>
  row
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());

/** Markdown → { html, headings } — headings (h2/h3) feed the table of contents. */
export function renderMarkdown(md: string, opts: Opts = {}): { html: string; headings: MarkdownHeading[] } {
  const lines = (md ?? "").replace(/\r\n?/g, "\n").replace(new RegExp(NUL, "g"), "").split("\n");
  const out: string[] = [];
  const headings: MarkdownHeading[] = [];
  const usedIds = new Map<string, number>();
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) out.push(`<p>${para.map((l) => inline(l.trim(), opts)).join("<br />")}</p>`);
    para = [];
  };
  const uniqueId = (text: string) => {
    const base = headingId(text);
    const n = usedIds.get(base) ?? 0;
    usedIds.set(base, n + 1);
    return n ? `${base}-${n + 1}` : base;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (RE.fence.test(line)) {
      flushPara();
      const code: string[] = [];
      while (++i < lines.length && !RE.fence.test(lines[i])) code.push(lines[i]);
      out.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }
    if (!line.trim()) {
      flushPara();
      continue;
    }
    const h = line.match(RE.heading);
    if (h) {
      flushPara();
      // The post title is the page's only <h1>, so "#" is demoted to <h2>.
      const level = Math.max(2, h[1].length) as 2 | 3 | 4;
      const plain = h[2].replace(/[*_`~]/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
      const id = uniqueId(plain);
      if (level <= 3) headings.push({ id, text: plain, level: level as 2 | 3 });
      out.push(`<h${level} id="${id}">${inline(h[2], opts)}</h${level}>`);
      continue;
    }
    if (RE.hr.test(line)) {
      flushPara();
      out.push("<hr />");
      continue;
    }
    const img = line.match(RE.image);
    if (img) {
      flushPara();
      const src = safeUrl(escapeHtml(img[2]));
      if (src) {
        const alt = escapeHtml(img[1]);
        const caption = img[3] ? escapeHtml(img[3]) : "";
        out.push(
          `<figure><img src="${src}" alt="${alt}" loading="lazy" decoding="async" />${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`,
        );
        continue;
      }
    }
    if (RE.quote.test(line)) {
      flushPara();
      const q: string[] = [];
      while (i < lines.length && RE.quote.test(lines[i])) q.push(lines[i++].replace(RE.quote, ""));
      i--;
      const paras = q.join("\n").split(/\n\s*\n/).filter((p) => p.trim());
      out.push(`<blockquote>${paras.map((p) => `<p>${p.split("\n").map((l) => inline(l.trim(), opts)).join("<br />")}</p>`).join("")}</blockquote>`);
      continue;
    }
    if (RE.ul.test(line) || RE.ol.test(line)) {
      flushPara();
      const ordered = RE.ol.test(line);
      const marker = ordered ? RE.ol : RE.ul;
      const items: string[][] = [];
      while (i < lines.length) {
        const l = lines[i];
        if (marker.test(l)) items.push([l.replace(marker, "")]);
        else if (l.trim() && /^\s+/.test(l) && items.length && !RE.ul.test(l) && !RE.ol.test(l)) items[items.length - 1].push(l.trim());
        else break;
        i++;
      }
      i--;
      const tag = ordered ? "ol" : "ul";
      const start = ordered ? Number(line.match(/\d+/)![0]) : 1;
      out.push(
        `<${tag}${ordered && start !== 1 ? ` start="${start}"` : ""}>${items.map((it) => `<li>${it.map((x) => inline(x, opts)).join("<br />")}</li>`).join("")}</${tag}>`,
      );
      continue;
    }
    if (RE.tableRow.test(line) && i + 1 < lines.length && RE.tableSep.test(lines[i + 1])) {
      flushPara();
      const head = cells(line);
      const align = cells(lines[i + 1]).map((c) => (c.startsWith(":") && c.endsWith(":") ? "center" : c.endsWith(":") ? "right" : null));
      const style = (j: number) => (align[j] ? ` style="text-align:${align[j]}"` : "");
      i += 2;
      const body: string[][] = [];
      while (i < lines.length && RE.tableRow.test(lines[i])) body.push(cells(lines[i++]));
      i--;
      out.push(
        `<div class="table-wrap"><table><thead><tr>${head.map((c, j) => `<th${style(j)}>${inline(c, opts)}</th>`).join("")}</tr></thead><tbody>${body
          .map((r) => `<tr>${head.map((_, j) => `<td${style(j)}>${inline(r[j] ?? "", opts)}</td>`).join("")}</tr>`)
          .join("")}</tbody></table></div>`,
      );
      continue;
    }
    para.push(line);
  }
  flushPara();
  return { html: out.join("\n"), headings };
}

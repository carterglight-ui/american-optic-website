#!/usr/bin/env node
/* ============================================================
   American Optic Media: blog builder
   Reads   blog-src/*.md   (one Markdown file per post)
   Writes  blog/index.html, blog/<slug>.html, sitemap.xml, rss.xml
   No dependencies. Run from the project root:  node scripts/build-blog.js
   ============================================================ */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "blog-src");
const OUT = path.join(ROOT, "blog");
const SITE = "https://americanopticmedia.com";
const NAME = "American Optic Media";
const DEFAULT_IMAGE = "/assets/og-image.jpg";
const DEFAULT_AUTHOR = "Carter Light";

/* ---------- helpers ---------- */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slugify = (s) => String(s).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const abs = (p) => (/^https?:\/\//.test(p) ? p : SITE + (p.startsWith("/") ? p : "/" + p));
const fmtDate = (iso) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

function parseFrontMatter(raw) {
  const m = raw.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error("missing front matter (--- block at the top)");
  const meta = {};
  m[1].split("\n").forEach((line) => {
    const i = line.indexOf(":");
    if (i < 1) return;
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    meta[line.slice(0, i).trim().toLowerCase()] = v;
  });
  return { meta, body: m[2] };
}

/* ---------- inline + block Markdown (small, safe subset) ---------- */
function inline(s) {
  s = esc(s);
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => `<img src="${src}" alt="${alt}" loading="lazy">`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, href) => {
    const external = /^https?:\/\//.test(href) && !href.startsWith(SITE);
    return `<a href="${href}"${external ? ' target="_blank" rel="noopener"' : ""}>${t}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, "$1<em>$2</em>");
  return s;
}

function render(body, title) {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  const used = new Set();
  let i = 0;
  let firstHeadingChecked = false;
  const isBlank = (l) => /^\s*$/.test(l);

  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) { i++; continue; }

    let m;
    if ((m = line.match(/^(#{1,4})\s+(.+?)\s*#*\s*$/))) {
      let level = m[1].length;
      const text = m[2];
      // A leading "# Title" that repeats the post title is dropped (the page already has the h1).
      if (!firstHeadingChecked && level === 1 && text.trim().toLowerCase() === title.trim().toLowerCase()) { firstHeadingChecked = true; i++; continue; }
      firstHeadingChecked = true;
      if (level === 1) level = 2; // the page title is the only h1
      let id = slugify(text) || "section";
      let n = 2; const base = id;
      while (used.has(id)) id = base + "-" + n++;
      used.add(id);
      out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      i++; continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) { out.push("<hr>"); i++; continue; }
    if ((m = line.match(/^\[youtube:\s*([A-Za-z0-9_-]{6,})\s*\]\s*$/i))) {
      out.push(`<div class="embed"><iframe src="https://www.youtube-nocookie.com/embed/${m[1]}" title="YouTube video" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`);
      i++; continue;
    }
    if ((m = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/))) {
      const cap = m[1].trim();
      out.push(`<figure><img src="${m[2]}" alt="${esc(cap)}" loading="lazy">${cap ? `<figcaption>${inline(cap)}</figcaption>` : ""}</figure>`);
      i++; continue;
    }
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, "")); i++; }
      out.push(`<blockquote><p>${inline(buf.join(" "))}</p></blockquote>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*]\s+/, "")); i++; }
      out.push("<ul>" + items.map((t) => `<li>${inline(t)}</li>`).join("") + "</ul>");
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+[.)]\s+/, "")); i++; }
      out.push("<ol>" + items.map((t) => `<li>${inline(t)}</li>`).join("") + "</ol>");
      continue;
    }
    const buf = [];
    while (i < lines.length && !isBlank(lines[i]) && !/^(#{1,4}\s|>|\s*[-*]\s+|\s*\d+[.)]\s+|!\[|\[youtube:|-{3,}\s*$)/i.test(lines[i])) { buf.push(lines[i].trim()); i++; }
    if (buf.length) out.push(`<p>${inline(buf.join(" "))}</p>`);
    else i++;
  }
  return out.join("\n");
}

const plainText = (html) => html.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();

/* ---------- shared page chrome ---------- */
const SYMBOLS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
    <symbol id="i-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></symbol>
    <symbol id="i-menu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></symbol>
    <symbol id="i-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></symbol>
  </svg>`;

function head({ title, description, canonical, image, type, jsonld, robots }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${canonical}">
  ${robots ? `<meta name="robots" content="${robots}">\n  ` : ""}<link rel="icon" type="image/png" href="/assets/favicon-64.png">
  <link rel="apple-touch-icon" href="/assets/app-icon-180.png">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="alternate" type="application/rss+xml" title="${NAME} Blog" href="${SITE}/rss.xml">
  <meta name="theme-color" content="#07090C">
  <meta property="og:type" content="${type}">
  <meta property="og:site_name" content="${NAME}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${abs(image)}">
  <meta name="twitter:card" content="summary_large_image">
  <script>document.documentElement.classList.add('js');</script>
  <script type="application/ld+json">${JSON.stringify(jsonld)}</script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/styles.css">
  <link rel="stylesheet" href="/css/blog.css">
</head>`;
}

const HEADER = `<body>
  <div class="bg" aria-hidden="true"></div>
  <a class="skip-link" href="#main">Skip to content</a>

  ${SYMBOLS}

  <header class="site-header">
    <div class="container">
      <nav class="nav" aria-label="Primary">
        <a class="brand" href="/index.html" aria-label="${NAME} home">
          <img class="brand__mark" src="/assets/ao-mark-lime-128.png" alt="" width="128" height="128">
          <span class="brand__name"><b>American Optic</b> <span>Media</span></span>
        </a>
        <button class="nav__toggle" type="button" aria-expanded="false" aria-controls="nav-links" aria-label="Menu">
          <svg class="icon-open" aria-hidden="true"><use href="#i-menu"/></svg>
          <svg class="icon-close" aria-hidden="true"><use href="#i-close"/></svg>
        </button>
        <div class="nav__links" id="nav-links">
          <a href="/index.html#solutions">Solutions</a>
          <a href="/gallery.html">Gallery</a>
          <a href="/blog/" aria-current="page">Blog</a>
          <a href="/index.html#process">Process</a>
          <a href="/index.html#contact">Contact</a>
          <a class="btn btn--primary nav__cta" href="#" data-quote-cta>Start a Project <svg aria-hidden="true"><use href="#i-arrow"/></svg></a>
        </div>
      </nav>
    </div>
  </header>
`;

const FOOTER = `
  <footer class="site-footer">
    <div class="container">
      <div class="site-footer__grid">
        <div>
          <a class="brand" href="/index.html" aria-label="${NAME} home">
            <img class="brand__mark" src="/assets/ao-mark-lime-128.png" alt="" width="128" height="128">
            <span class="brand__name"><b>American Optic</b> <span>Media</span></span>
          </a>
          <p>Full-service video production. Commercials, social, industrial and corporate.</p>
        </div>
        <div>
          <h4>Company</h4>
          <ul>
            <li><a href="/index.html#solutions">Solutions</a></li>
            <li><a href="/gallery.html">Gallery</a></li>
            <li><a href="/blog/">Blog</a></li>
            <li><a href="/index.html#process">Process</a></li>
            <li><a href="#" data-quote-cta>Get a Quote</a></li>
          </ul>
        </div>
        <div>
          <h4>Contact</h4>
          <ul>
            <li><a href="#" data-email-link>email</a></li>
            <li><a href="#" data-call-cta>phone</a></li>
            <li><span data-location>Location</span></li>
          </ul>
        </div>
      </div>
      <div class="site-footer__bar">
        <span>&copy; <span id="year"></span> ${NAME}. All rights reserved.</span>
        <span>Licensed &amp; insured</span>
      </div>
    </div>
  </footer>

  <script src="/js/site-config.js"></script>
  <script src="/js/main.js"></script>
</body>
</html>
`;

const CTA = `
    <section class="section post-cta-wrap">
      <div class="container">
        <div class="cta-band reveal">
          <h2>Have a project in mind?</h2>
          <p>Tell us what you need and we'll build you a custom quote.</p>
          <div class="cta-band__actions">
            <a class="btn btn--primary" href="#" data-quote-cta>Get a custom quote <svg aria-hidden="true"><use href="#i-arrow"/></svg></a>
            <a class="btn btn--ghost" href="#" data-call-cta>phone</a>
          </div>
        </div>
      </div>
    </section>`;

/* ---------- load posts ---------- */
function loadPosts() {
  if (!fs.existsSync(SRC)) return [];
  const posts = [];
  for (const f of fs.readdirSync(SRC).filter((n) => n.endsWith(".md") && !n.startsWith("_")).sort()) {
    let parsed;
    try { parsed = parseFrontMatter(fs.readFileSync(path.join(SRC, f), "utf8")); }
    catch (e) { throw new Error(`${f}: ${e.message}`); }
    const { meta, body } = parsed;
    const base = f.replace(/\.md$/, "");
    const fileDate = (base.match(/^(\d{4}-\d{2}-\d{2})/) || [])[1];
    const title = meta.title;
    const date = meta.date || fileDate;
    if (!title) throw new Error(`${f}: missing "title"`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) throw new Error(`${f}: missing or invalid "date" (use YYYY-MM-DD)`);
    if (/^(true|yes)$/i.test(meta.draft || "")) { console.log(`  skipping draft: ${f}`); continue; }
    const slug = slugify(meta.slug || base.replace(/^\d{4}-\d{2}-\d{2}-?/, "")) || slugify(title);
    const html = render(body, title);
    const words = plainText(html).split(" ").filter(Boolean).length;
    const description = (meta.description || plainText(html).slice(0, 155)).trim();
    posts.push({
      file: f, slug, title, date, updated: meta.updated || date, description,
      image: meta.image || "", imageAlt: meta.imagealt || title,
      tags: (meta.tags || "").split(",").map((t) => t.trim()).filter(Boolean),
      author: meta.author || DEFAULT_AUTHOR, html, minutes: Math.max(1, Math.round(words / 200)),
    });
  }
  const slugs = new Set();
  posts.forEach((p) => { if (slugs.has(p.slug)) throw new Error(`duplicate slug: ${p.slug}`); slugs.add(p.slug); });
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)); // newest first
  return posts;
}

/* ---------- page builders ---------- */
function card(p) {
  const media = p.image
    ? `<img src="${p.image}" alt="" loading="lazy" width="1200" height="675">`
    : `<img class="post-card__mark" src="/assets/ao-mark-lime-128.png" alt="" width="128" height="128">`;
  return `        <li class="post-card">
          <a class="post-card__link" href="/blog/${p.slug}.html">
            <div class="post-card__media${p.image ? "" : " post-card__media--blank"}">${media}</div>
            <div class="post-card__body">
              <p class="post-card__meta"><time datetime="${p.date}">${fmtDate(p.date)}</time> <span aria-hidden="true">&middot;</span> ${p.minutes} min read</p>
              <h2 class="post-card__title">${esc(p.title)}</h2>
              <p class="post-card__excerpt">${esc(p.description)}</p>
              <span class="post-card__more">Read more <svg aria-hidden="true"><use href="#i-arrow"/></svg></span>
            </div>
          </a>
        </li>`;
}

function buildIndex(posts) {
  const canonical = `${SITE}/blog/`;
  const title = `Video Production Blog | ${NAME}`;
  const description = "Video production tips, dealership marketing ideas and behind the scenes stories from American Optic Media in Jacksonville, Florida.";
  const jsonld = {
    "@context": "https://schema.org", "@type": "Blog", name: `${NAME} Blog`, url: canonical, description,
    publisher: { "@type": "Organization", name: NAME, url: SITE },
    blogPost: posts.slice(0, 20).map((p) => ({ "@type": "BlogPosting", headline: p.title, url: `${SITE}/blog/${p.slug}.html`, datePublished: p.date })),
  };
  const list = posts.length
    ? `<ul class="post-grid">\n${posts.map(card).join("\n")}\n      </ul>`
    : `<p class="blog-empty">New posts are on the way. Check back soon.</p>`;
  return head({ title, description, canonical, image: (posts.find((p) => p.image) || {}).image || DEFAULT_IMAGE, type: "website", jsonld }) + "\n" + HEADER + `
  <main id="main">
    <section class="result-hero">
      <div class="container">
        <p class="eyebrow eyebrow--accent">The blog</p>
        <h1>Video ideas that move your business</h1>
        <p>Practical video production tips, marketing ideas for dealerships and local businesses, and stories from behind the camera.</p>
      </div>
    </section>

    <section class="section blog-list">
      <div class="container">
      ${list}
      </div>
    </section>
${CTA}
  </main>
` + FOOTER;
}

function buildPost(p, posts) {
  const canonical = `${SITE}/blog/${p.slug}.html`;
  const image = p.image || DEFAULT_IMAGE;
  const title = `${p.title} | ${NAME}`;
  const others = posts.filter((x) => x.slug !== p.slug).slice(0, 3);
  const jsonld = [
    {
      "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, description: p.description,
      image: [abs(image)], datePublished: p.date, dateModified: p.updated,
      author: { "@type": "Person", name: p.author }, publisher: { "@type": "Organization", name: NAME, url: SITE, logo: { "@type": "ImageObject", url: abs("/assets/ao-mark-lime-512.png") } },
      mainEntityOfPage: canonical, ...(p.tags.length ? { keywords: p.tags.join(", ") } : {}),
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE + "/" },
        { "@type": "ListItem", position: 2, name: "Blog", item: SITE + "/blog/" },
        { "@type": "ListItem", position: 3, name: p.title, item: canonical },
      ],
    },
  ];
  const cover = p.image ? `\n        <figure class="post__cover"><img src="${p.image}" alt="${esc(p.imageAlt)}" width="1200" height="675" fetchpriority="high"></figure>` : "";
  const tags = p.tags.length ? `\n        <ul class="post__tags" aria-label="Topics">${p.tags.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : "";
  const more = others.length
    ? `\n    <section class="section post-more">
      <div class="container">
        <h2 class="post-more__h">More from the blog</h2>
        <ul class="post-grid">\n${others.map(card).join("\n")}\n        </ul>
      </div>
    </section>` : "";
  return head({ title, description: p.description, canonical, image, type: "article", jsonld }) + "\n" + HEADER + `
  <main id="main">
    <article class="post">
      <div class="container container--post">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="/blog/">Blog</a> <span aria-hidden="true">/</span> <span>${esc(p.title)}</span></nav>
        <p class="eyebrow eyebrow--accent">${p.tags[0] ? esc(p.tags[0]) : "Blog"}</p>
        <h1 class="post__title">${esc(p.title)}</h1>
        <p class="post__meta">By ${esc(p.author)} <span aria-hidden="true">&middot;</span> <time datetime="${p.date}">${fmtDate(p.date)}</time> <span aria-hidden="true">&middot;</span> ${p.minutes} min read</p>${cover}
        <div class="prose">
${p.html}
        </div>${tags}
      </div>
    </article>
${CTA}${more}
  </main>
` + FOOTER;
}

function buildSitemap(posts) {
  const urls = [
    { loc: SITE + "/", lastmod: null, pri: "1.0" },
    { loc: SITE + "/gallery.html", lastmod: null, pri: "0.7" },
    { loc: SITE + "/blog/", lastmod: posts[0] ? posts[0].updated : null, pri: "0.8" },
    ...posts.map((p) => ({ loc: `${SITE}/blog/${p.slug}.html`, lastmod: p.updated, pri: "0.6" })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<priority>${u.pri}</priority></url>`).join("\n") + "\n</urlset>\n";
}

function buildRss(posts) {
  const items = posts.slice(0, 20).map((p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${SITE}/blog/${p.slug}.html</link>
      <guid>${SITE}/blog/${p.slug}.html</guid>
      <pubDate>${new Date(p.date + "T12:00:00Z").toUTCString()}</pubDate>
      <description>${esc(p.description)}</description>
    </item>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>${NAME} Blog</title>\n    <link>${SITE}/blog/</link>\n    <description>Video production tips and stories from ${NAME}.</description>\n${items}\n  </channel>\n</rss>\n`;
}

/* ---------- run ---------- */
function main() {
  const posts = loadPosts();
  fs.mkdirSync(OUT, { recursive: true });
  // remove stale generated post pages (keeps the folder in sync when a post is deleted or renamed)
  for (const f of fs.readdirSync(OUT)) if (f.endsWith(".html")) fs.unlinkSync(path.join(OUT, f));
  fs.writeFileSync(path.join(OUT, "index.html"), buildIndex(posts));
  posts.forEach((p) => fs.writeFileSync(path.join(OUT, p.slug + ".html"), buildPost(p, posts)));
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), buildSitemap(posts));
  fs.writeFileSync(path.join(ROOT, "rss.xml"), buildRss(posts));
  console.log(`Built ${posts.length} post${posts.length === 1 ? "" : "s"}: blog/index.html, sitemap.xml, rss.xml`);
  posts.forEach((p) => console.log(`  /blog/${p.slug}.html  (${p.date}, ${p.minutes} min)`));
}
main();

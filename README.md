# American Optic Media — website

Static site. No build step, no dependencies. Open `index.html` in a browser, or
drop the whole folder on any static host (Netlify, Vercel, GitHub Pages, S3, a
plain web server).

```
index.html          Homepage + "what type of video are you looking for?" search
results.html         Estimate / referral page (reads ?q= from the search)
quote.html           Custom-quote contact form, where every CTA ends up
gallery.html         Photos, YouTube/TV and social rows with a 3D scroll
css/styles.css       All styling. Brand tokens are at the top in :root.
js/site-config.js    Business contact info + optional links. EDIT THIS FIRST.
js/main.js           Shared behaviour (nav, hero video, contact links, search)
js/catalog.js        Scope, categories, keywords & pricing. EDIT for pricing changes.
js/results.js        Renders results.html from js/catalog.js. Rarely needs editing.
js/quote.js          Contact-form behaviour (prefill, send, fallback).
js/gallery.js        Gallery 3D scroll + Prev/Next buttons.
js/lightbox.js       On-page video/photo viewer (any <a data-lightbox>).
assets/              Logos, favicon, hero loop + poster, link-preview image, gallery photos
Media/               Your original source files (not used directly by the site)
```

## 1. Your real details

Already set in **`js/site-config.js`**:

| Field | Current value |
|-------|---------------|
| `email` | `carter@americanopticmedia.com` (public address shown on the site) |
| `phone` / `phoneHref` | `(904) 608-4693` / `+19046084693` |
| `location` | `Jacksonville, Florida` |
| `calendarUrl` | empty. If you use Calendly/etc., paste it here and every "quote" CTA links straight there instead of the form |
| `formEndpoint` | `https://formsubmit.co/ajax/Carter.g.light@gmail.com`, see "The contact form" below |

## 2. The contact form (`quote.html`)

Messages are delivered straight to your inbox through
[FormSubmit](https://formsubmit.co), a free service that needs no account.

**One-time activation (required):** the first time a message is sent through
the form, FormSubmit emails `Carter.g.light@gmail.com` an activation link.
Send one test message from the live site, open that email (check spam), and
click the confirm link. Until that is done, nothing is lost: the form detects
the failure and opens the visitor's email app pre-filled instead.

How it behaves:

- Success shows a "Message sent" screen. Replies go to the visitor's own email.
- Any failure (not activated, offline, service down) falls back to the
  visitor's email app, with your phone number shown as a second option.
- A hidden spam-trap field (`_honey`) silently drops bots.
- To switch back to email-app-only, set `formEndpoint` to `""`.
- To use a different service (Formspree, Web3Forms), paste its endpoint into
  `formEndpoint`. Fields sent: name, email, phone, business, project, message.

## 2b. The hero video

The homepage hero loops `assets/hero-loop.mp4` (13 seconds, 720p, muted, no
audio track, ~2.7 MB) with `assets/hero-poster.jpg` as the still frame. It
pauses when scrolled out of view, has a visible pause button, and stays on the
poster for visitors who have turned on "reduce motion". It was cut from the
original 4K pitch footage with the letterbox bars cropped out:

```bash
ffmpeg -ss <start> -t <seconds> -i "Media/Carter Pitch 2024(with hologram).mp4" \
  -filter_complex "[0:v]crop=3000:1688:420:236,scale=1280:720,fps=24,format=yuv420p[v]" ...
```

To change the footage, cut a new clip the same way (16:9, under about 4 MB)
and overwrite `assets/hero-loop.mp4`, then regenerate `assets/hero-poster.jpg`
from a good frame.

## 2c. After connecting americanopticmedia.com

The `og:url`, `og:image` and JSON-LD `url`/`image` lines in the `<head>` of
`index.html` now point at `https://americanopticmedia.com`. (Link previews
need absolute URLs, which is why they are not relative.) The old
`aomedia.netlify.app` address still works.

## 3. Branding

Colours, spacing, radius and type are CSS variables at the top of
**`css/styles.css`** under `:root`. The brand lime `#A0FF09` was sampled from
`Media/Logo/AO logo_Green on Black.JPG`. Change `--accent` and everything follows.

**Logos** (in `assets/`, regenerated from `Media/Logo/` — the white background of
the source eagle PNG was keyed out to transparent and recoloured):

- `ao-mark-lime-128.png` / `ao-mark-lime-512.png` — lime eagle mark on transparent.
  Used in the header, footer and hero panel.
- `ao-mark-white-512.png` — white eagle mark, for light backgrounds.
- `ao-wordmark-white.png` — white script wordmark, for dark backgrounds.
- `ao-wordmark-green.jpg` — green-on-black script wordmark, used as the social share image.
- `favicon-64.png` — lime eagle, browser tab icon.

The header/footer currently use the eagle mark + type-set "American Optic Media".
To use the script wordmark image instead, replace the `.brand` markup in
`index.html` / `results.html` with `<img src="assets/ao-wordmark-white.png" alt="American Optic Media" style="height:26px;width:auto">`.

If you get official vector (SVG) logos later, drop them in `assets/` and swap the
`<img>` `src` values — no other changes needed.

## 4. How the search → results flow works

Everything about scope and pricing lives in **`js/catalog.js`**. There are
three possible outcomes for a search, decided by `detect()` scoring the typed
text against keyword lists:

1. **In-scope categories → the 3-tier estimate.** Automotive & Marine, Social
   & Promo, Commercial, Corporate & Training, Testimonial, and Corporate Events.
   All six use the **same pricing** — Starter $750, Basic $2,000, Top Tier
   $3,500 — because that's the structure you gave for "any business." Each
   category only changes the headline, blurb, and one flavour line per tier
   (e.g. automotive's Starter adds "Shot at your dealership or lot"). The
   shared deliverables (3 videos, 10 reels, etc.) live in `SHARED_BASE`.
   Every tier page also shows a fixed note that full broadcast commercials
   with actors can run **up to $10,000**, and pushes to `quote.html` for an
   exact number.
2. **Industrial & Aerial (drone/construction) → a "from $1,000, varies" panel.**
   No 3-tier grid, since you said this genuinely depends on the site. The
   `$1,000` starting figure in `INDUSTRIAL.startingFrom` is a **placeholder —
   confirm or change this number**, it's the one figure you didn't give me.
3. **Everything else → the referral / custom-quote message.** Weddings,
   personal events, real estate, product/e-commerce, film & music video, and
   anything unrecognised all show the same line you asked for: *"We may not
   specialize in this area, but contact us so we can better understand your
   vision to build you a custom quote or refer you to someone who can."* —
   plus a button to the quote form and your phone number. Only a handful of
   keywords trigger the tiered categories; everything else safely falls here.

### Editing pricing or copy

All in `js/catalog.js`:

- **Change all tier prices at once** → edit `TIER_META.starter/basic/top.price`.
- **Change what's included at every tier** → edit `SHARED_BASE`.
- **Change one category's headline/blurb/flavour line** → edit that entry in `IN_SCOPE`.
- **Add a new in-scope category** → copy a block in `IN_SCOPE`, give it a `key`,
  `label`, `match` keywords, `eyebrow`, `headline`, `blurb`, and one `flavor`
  line per tier. It automatically gets the standard $750/$2,000/$3,500 pricing.
- **Move a category from "referral" to "gets an estimate"** (or the reverse) →
  cut its block between `OFFSCOPE` and `IN_SCOPE`.
- **Change the referral message** → edit `OFF_SCOPE_MESSAGE`.
- **Change the industrial starting price / included items** → edit `INDUSTRIAL`.

`js/results.js` just renders whatever `catalog.js` decides — you shouldn't
need to touch it for pricing or wording changes.

## 5. The pitch video

The homepage's "Watch our pitch" section (just above the footer CTA) plays
`assets/pitch-reel.mp4` directly, self-hosted, no third-party player involved.

This is a compressed copy of `Media/Carter Pitch 2024(with hologram).mp4`:
the original is 4K and ~259 MB (too big for GitHub, which hard-rejects any
file over 100 MB); `assets/pitch-reel.mp4` is the same video re-encoded to
1080p at ~33 MB, which fits comfortably in the repo and plays instantly. It
was generated with:

```bash
ffmpeg -i "Media/Carter Pitch 2024(with hologram).mp4" \
  -vf "scale=1920:-2" -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 128k -movflags +faststart \
  assets/pitch-reel.mp4
```

We tried Vimeo and YouTube-style embeds first, but some networks block
third-party video-player domains outright (we hit this ourselves testing on
two separate networks) and show a "couldn't verify the security of your
connection" page instead of the video. Self-hosting the compressed file
sidesteps that entirely: it's just a normal video file served from the same
domain as everything else, so nothing can block it that isn't already
blocking the whole site.

A Vimeo-embed version is commented out right below the `<video>` tag in
`index.html`'s "REEL" section, kept for reference in case you ever want to
switch back.

To swap in a different video later: compress a new cut the same way
(`ffmpeg` command above, replacing the input file) and overwrite
`assets/pitch-reel.mp4`, or point the `<source src="...">` at a new filename.

## 6. Accessibility notes

Built to WCAG AA: visible focus rings, real form labels, keyboard-operable
everywhere, `prefers-reduced-motion` respected, colour never the only signal,
44px+ touch targets, semantic landmarks and headings. Test with a screen reader
after you swap in real copy.

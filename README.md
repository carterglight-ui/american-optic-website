# American Optic Media — website

Static site. No build step, no dependencies. Open `index.html` in a browser, or
drop the whole folder on any static host (Netlify, Vercel, GitHub Pages, S3, a
plain web server).

```
index.html          Homepage + "what type of video are you looking for?" search
results.html         Estimate / referral page (reads ?q= from the search)
quote.html           Custom-quote contact form — where every CTA ends up
css/styles.css       All styling. Brand tokens are at the top in :root.
js/site-config.js    Business contact info + optional links — EDIT THIS FIRST.
js/main.js           Shared behaviour (nav, reveal, contact links, search submit)
js/catalog.js         Your scope, categories, keywords & pricing — EDIT THIS for pricing changes.
js/results.js        Renders results.html from js/catalog.js — rarely needs editing.
js/quote.js           Contact-form behaviour (prefill + submit).
assets/              Logos + favicon (generated from Media/Logo/)
Media/               Your original source files (not used directly by the site)
```

## 1. Your real details

Already set in **`js/site-config.js`**:

| Field | Current value |
|-------|---------------|
| `email` | `Carter.g.light@gmail.com` |
| `phone` / `phoneHref` | `(904) 608-4693` / `+19046084693` |
| `location` | `Jacksonville, Florida` — **unconfirmed placeholder, please check this** |
| `reelUrl` | empty — optional YouTube/Vimeo link, currently unused in the layout |
| `calendarUrl` | empty — if you use Calendly/etc., paste it here and every "quote" CTA links straight there instead of the form |
| `formEndpoint` | empty — see "The contact form" below |

## 2. The contact form (`quote.html`)

Out of the box, submitting the form **opens the visitor's email app** with
everything pre-filled to `Carter.g.light@gmail.com` — no setup required, but
they have to hit send themselves.

To make it submit silently, straight to your inbox, with no email app involved:

1. Go to [formspree.io](https://formspree.io) and create a free account.
2. Create a new form, point it at your email, confirm the verification email.
3. Copy the endpoint it gives you (looks like `https://formspree.io/f/abcdwxyz`).
4. Paste it into `formEndpoint` in `js/site-config.js`.

That's it — no other code changes. (Any similar static-form service, e.g.
Web3Forms, works the same way.)

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

The homepage's "Watch our pitch" section (just above the footer CTA) embeds
the pitch video via Vimeo (`https://player.vimeo.com/video/983887201`),
confirmed working on the live deployed site. This is intentional: the raw
file is ~259 MB, `.gitignore` excludes `Media/` from Git (GitHub hard-rejects
anything over 100 MB), and even if it didn't, a 259 MB video is a terrible
experience on mobile data. Vimeo streams it instead, so the deployed page
stays fast.

A local-file fallback (`<video src="Media/...">`) is commented out right
below the Vimeo embed in `index.html`'s "REEL" section, in case you ever want
to preview a different local cut before it's uploaded anywhere. It only works
when `Media/` is actually present, i.e. local previews, never the deployed
site.

To swap in a different video later, edit the `<iframe src="...">`: replace
the id in `https://player.vimeo.com/video/<id>` with the new Vimeo video's id
(or use `https://www.youtube.com/embed/<id>` for YouTube instead). If a video
ever shows as private/unavailable when embedded, check its Privacy settings
on vimeo.com and make sure "Where can this be embedded" allows your domain
(or "Anywhere").

## 6. Accessibility notes

Built to WCAG AA: visible focus rings, real form labels, keyboard-operable
everywhere, `prefers-reduced-motion` respected, colour never the only signal,
44px+ touch targets, semantic landmarks and headings. Test with a screen reader
after you swap in real copy.

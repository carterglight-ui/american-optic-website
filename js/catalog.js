/* ============================================================
   American Optic Media — service catalog & scope detection
   Shared by results.html and quote.html.

   SCOPE MODEL
   -----------
   - IN_SCOPE: the handful of business types AO actually markets to.
     These get the 3-tier estimate (Starter / Basic / Top Tier), all
     using the SAME pricing structure ($750 / $2,000 / $3,500).
   - INDUSTRIAL: drone / construction / aerial. Pricing genuinely varies
     by site, so it gets a single "from $X" panel instead of 3 tiers.
   - OFFSCOPE: anything AO doesn't do (weddings, real estate, personal
     events, films, product/e-commerce) plus anything unrecognised.
     These all get the same referral message + a link to request a
     custom quote anyway.
   ============================================================ */
window.AO_CATALOG = (function () {
  "use strict";

  /* ---- Shared tier framing + pricing (identical for every in-scope category) */
  var TIER_META = {
    starter: {
      name: "Starter",
      price: 750,
      tagline: "A quick content batch.",
      bestFor: "Testing the water with a single shoot."
    },
    basic: {
      name: "Basic",
      price: 2000,
      tagline: "A full content package.",
      bestFor: "The most common plan for dealerships & SMBs.",
      featured: true,
      flag: "Most popular"
    },
    top: {
      name: "Top Tier",
      price: 3500,
      tagline: "Go all-in for a push.",
      bestFor: "Brands ready to produce at scale."
    }
  };

  /* ---- Deliverables shared by every in-scope category, per tier ---- */
  var SHARED_BASE = {
    starter: ["2 social media reels"],
    basic: ["1 day of shooting", "1 fully edited commercial or event recap — or 10 social media reels"],
    top: ["4 full days of shooting", "15 reels cut in trending / viral formats", "Up to 2 TV-formatted commercials", "A full set of photos"]
  };

  /* ---- In-scope categories: tiered estimate ------------------------ */
  var IN_SCOPE = [
    {
      key: "automotive", type: "tier", label: "Automotive & Marine",
      match: ["car dealership", "dealership", "dealer", "car ad", "auto ", "automotive", "vehicle", "truck", "motors", "car lot", "used car", "test drive", "boat dealer", "boat sales", "marine sales"],
      eyebrow: "Auto & marine dealer video",
      headline: "Video that moves inventory",
      blurb: "Spots and social built to fill your lot with buyers — shot on-site and cut for every screen.",
      flavor: {
        starter: "1 inventory photoshoot",
        basic: "Inventory b-roll and photoshoot",
        top: "Includes a drone lot flyover"
      }
    },
    {
      key: "social", type: "tier", label: "Social & Promo",
      match: ["social media", "social content", "instagram", "tiktok", "tik tok", "reel", "reels", "short-form", "short form", "shorts", "ugc", "content creation", "content package", "youtube", "vertical video", "influencer", "promo video", "promotional video", "small business", "social campaign"],
      eyebrow: "Social content",
      headline: "Scroll-stopping content, on a schedule",
      blurb: "Short-form video engineered for the feed — hooks in the first second, built to be posted often.",
      flavor: {
        starter: "1 product & brand photoshoot",
        basic: "Product & brand b-roll and photoshoot",
        top: "A full campaign push across every platform"
      }
    },
    {
      key: "commercial", type: "tier", label: "Commercial",
      match: ["commercial", "tv spot", "tv ad", "broadcast", "advert", "advertisement", "ad campaign", "brand film", "brand video"],
      eyebrow: "Brand commercial",
      headline: "The commercial your brand deserves",
      blurb: "Concept-driven brand spots — written, shot and finished to run anywhere.",
      flavor: {
        starter: "1 brand photoshoot",
        basic: "On-location b-roll and photoshoot",
        top: "Full creative concept, casting & broadcast cuts"
      }
    },
    {
      key: "corporate", type: "tier", label: "Corporate & Training",
      match: ["training", "explainer", "corporate", "internal", "onboarding", "safety video", "hr ", "recruitment", "recruiting", "orientation", "how-to", "how to", "b-roll", "b roll", "staff training", "employee video"],
      eyebrow: "Corporate & training",
      headline: "Make the important stuff impossible to ignore",
      blurb: "Training, onboarding and B-roll that your team actually watches and remembers.",
      flavor: {
        starter: "1 facility & team photoshoot",
        basic: "Facility & team b-roll and photoshoot",
        top: "A full training series or capabilities film"
      }
    },
    {
      key: "testimonial", type: "tier", label: "Testimonial",
      match: ["testimonial", "case study", "customer story", "client story", "success story", "review video", "customer review"],
      eyebrow: "Testimonial & case study",
      headline: "Let your customers do the closing",
      blurb: "Authentic customer stories, shot and edited to build trust and shorten the sales cycle.",
      flavor: {
        starter: "1 customer photoshoot",
        basic: "Customer interview b-roll and photoshoot",
        top: "A small library of stories across locations"
      }
    },
    {
      key: "event", type: "tier", label: "Corporate Event",
      match: ["conference", "corporate event", "company event", "trade show", "tradeshow", "expo", "summit", "corporate retreat", "company party", "company off-site"],
      eyebrow: "Corporate event coverage",
      headline: "Relive the room — and sell the next one",
      blurb: "Same-week highlight clips and a recap film for your conference or company event.",
      flavor: {
        starter: "1 event-day photoshoot",
        basic: "Event b-roll and photoshoot",
        top: "Multi-day coverage with a same-week highlight film"
      }
    }
  ];

  /* ---- Industrial / drone: pricing genuinely varies ----------------- */
  var INDUSTRIAL = {
    key: "industrial", type: "industrial", label: "Industrial & Aerial",
    match: ["construction", "drone", "aerial", "industrial", "manufacturing", "warehouse", "job site", "jobsite", "infrastructure", "facility video", "site visit", "roofing", "solar site", "progress footage"],
    eyebrow: "Industrial & aerial",
    headline: "Scale, safety and progress — on camera",
    blurb: "Drone and ground coverage for construction, manufacturing and infrastructure. Licensed and insured.",
    startingFrom: 1000,
    includes: ["Site visit & flight plan", "Licensed & insured drone pilot", "Aerial + ground b-roll", "One fully edited video"]
  };

  /* ---- Off-scope: same referral message for all of these ----------- */
  var OFF_SCOPE_MESSAGE = "We may not specialize in this area, but contact us so we can better understand your vision to build you a custom quote or refer you to someone who can.";

  var OFFSCOPE = [
    { key: "wedding", type: "offscope", label: "Wedding Videography", match: ["wedding", "bride", "groom", "engagement video", "elopement"] },
    { key: "personal", type: "offscope", label: "Personal Event", match: ["birthday", "quinceanera", "quinceañera", "bar mitzvah", "bat mitzvah", "funeral", "memorial video", "anniversary party", "family video", "personal video"] },
    { key: "realestate", type: "offscope", label: "Real Estate", match: ["real estate", "realtor", "listing video", "property tour", "home tour", "house tour", "apartment tour", "mls", "open house", "condo tour"] },
    { key: "product", type: "offscope", label: "Product / E-commerce", match: ["product video", "ecommerce", "e-commerce", "unboxing", "amazon listing", "product launch", "product demo"] },
    { key: "creative", type: "offscope", label: "Film & Music Video", match: ["music video", "short film", "documentary", "narrative film", "feature film", "film project", " band ", "artist project"] }
  ];

  var FALLBACK = { key: "custom", type: "offscope", label: null, match: [] };

  var ALL = IN_SCOPE.concat([INDUSTRIAL]).concat(OFFSCOPE);

  /* ---- Detection ----------------------------------------------------- */
  function normalize(q) {
    return " " + q.toLowerCase().replace(/[^a-z0-9&\s-]/g, " ").replace(/\s+/g, " ") + " ";
  }

  function detect(query) {
    var q = normalize(query);
    var best = null, bestScore = 0;
    ALL.forEach(function (cat) {
      var score = 0;
      cat.match.forEach(function (kw) {
        if (q.indexOf(kw.toLowerCase()) !== -1) {
          score += kw.trim().indexOf(" ") !== -1 ? 2 : 1;
        }
      });
      if (score > bestScore) { bestScore = score; best = cat; }
    });
    return best || FALLBACK;
  }

  function money(n) { return "$" + n.toLocaleString("en-US"); }

  return {
    TIER_META: TIER_META,
    SHARED_BASE: SHARED_BASE,
    IN_SCOPE: IN_SCOPE,
    INDUSTRIAL: INDUSTRIAL,
    OFFSCOPE: OFFSCOPE,
    FALLBACK: FALLBACK,
    OFF_SCOPE_MESSAGE: OFF_SCOPE_MESSAGE,
    detect: detect,
    money: money
  };
})();

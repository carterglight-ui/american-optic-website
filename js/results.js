/* ============================================================
   American Optic Media — results renderer
   Reads ?q= from the URL, asks js/catalog.js what it is, then
   renders one of three things:
     - tier grid (3 estimates)         → in-scope categories
     - a "from $X, varies" panel       → industrial / drone
     - a referral / custom-quote panel → everything off-scope
   Edit pricing & copy in js/catalog.js, not here.
   ============================================================ */
(function () {
  "use strict";
  var CAT = window.AO_CATALOG;

  function svgCheck() { return '<svg aria-hidden="true"><use href="#i-check"/></svg>'; }
  function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

  function quoteUrl(ctx) {
    var params = new URLSearchParams();
    if (ctx.q) params.set("q", ctx.q);
    if (ctx.category) params.set("category", ctx.category);
    if (ctx.tier) params.set("tier", ctx.tier);
    if (ctx.price) params.set("price", ctx.price);
    if (ctx.scope) params.set("scope", ctx.scope);
    var qs = params.toString();
    return "quote.html" + (qs ? "?" + qs : "");
  }

  /* ---- Tier grid (in-scope) ---------------------------------------- */
  function renderTiers(query, cat) {
    document.getElementById("result-title").textContent = cat.headline;
    document.getElementById("result-blurb").textContent = cat.blurb;
    document.title = cat.label + " video — American Optic Media";

    var estimateNote = document.getElementById("estimate-note");
    if (estimateNote) estimateNote.hidden = false;

    var order = ["starter", "basic", "top"];
    var tiersEl = document.getElementById("tiers");
    var frag = document.createDocumentFragment();

    order.forEach(function (key) {
      var meta = CAT.TIER_META[key];
      var article = document.createElement("article");
      article.className = "tier" + (meta.featured ? " tier--featured" : "");
      article.setAttribute("aria-labelledby", "tier-" + key);

      if (meta.flag) {
        var flag = document.createElement("span");
        flag.className = "tier__flag";
        flag.innerHTML = '<span class="visually-hidden">Recommended: </span>' + meta.flag;
        article.appendChild(flag);
      }

      var head = document.createElement("div");
      head.innerHTML =
        '<h3 class="tier__name" id="tier-' + key + '">' + meta.name + '</h3>' +
        '<p class="tier__tagline">' + meta.tagline + '</p>';
      article.appendChild(head);

      var price = document.createElement("p");
      price.className = "tier__price";
      price.innerHTML = CAT.money(meta.price) + "<small>estimated starting price</small>";
      article.appendChild(price);

      var bestfor = document.createElement("p");
      bestfor.className = "tier__bestfor";
      bestfor.textContent = meta.bestFor;
      article.appendChild(bestfor);

      var ul = document.createElement("ul");
      ul.className = "tier__list";
      var items = [cat.flavor[key]].concat(CAT.SHARED_BASE[key]);
      items.forEach(function (text) {
        var li = document.createElement("li");
        li.innerHTML = svgCheck() + "<span></span>";
        li.querySelector("span").textContent = text;
        ul.appendChild(li);
      });
      article.appendChild(ul);

      var cta = document.createElement("a");
      cta.className = "btn " + (meta.featured ? "btn--primary" : "btn--ghost");
      cta.innerHTML = "Get my custom quote " + '<svg aria-hidden="true"><use href="#i-arrow"/></svg>';
      cta.href = quoteUrl({ q: query, category: cat.label, tier: meta.name, price: meta.price });
      cta.setAttribute("aria-label", "Get a custom quote based on the " + meta.name + " estimate");
      article.appendChild(cta);

      frag.appendChild(article);
    });

    tiersEl.className = "tiers";
    tiersEl.innerHTML = "";
    tiersEl.appendChild(frag);

    var note = document.getElementById("result-note");
    note.hidden = false;
    document.getElementById("note-cta").href = quoteUrl({ q: query, category: cat.label });
  }

  /* ---- Industrial / drone: "from $X" panel ------------------------- */
  function renderIndustrial(query, cat) {
    document.getElementById("result-title").textContent = cat.headline;
    document.getElementById("result-blurb").textContent = cat.blurb;
    document.title = cat.label + " — American Optic Media";

    var tiersEl = document.getElementById("tiers");
    tiersEl.className = "scope-panel-wrap";
    tiersEl.innerHTML =
      '<div class="scope-panel">' +
        '<p class="eyebrow eyebrow--accent">' + esc(cat.label) + '</p>' +
        '<p class="scope-panel__price">' + CAT.money(cat.startingFrom) + '<small>starting from — varies by site, access & scope</small></p>' +
        '<ul class="scope-panel__list">' +
          cat.includes.map(function (t) { return "<li>" + svgCheck() + "<span>" + esc(t) + "</span></li>"; }).join("") +
        "</ul>" +
        '<p class="scope-panel__foot">Every drone & industrial job is different — tell us about the site and scope and we’ll build an exact quote.</p>' +
        '<div class="scope-panel__actions">' +
          '<a class="btn btn--primary" href="' + quoteUrl({ q: query, category: cat.label }) + '">Get a custom quote <svg aria-hidden="true"><use href="#i-arrow"/></svg></a>' +
        "</div>" +
      "</div>";

    document.getElementById("result-note").hidden = true;
  }

  /* ---- Off-scope: referral message --------------------------------- */
  function renderOffscope(query, cat) {
    var title = query ? "Let’s find you the right fit" : "Tell us about your project";
    document.getElementById("result-title").textContent = title;
    document.getElementById("result-blurb").textContent = "";
    document.title = "Custom quote — American Optic Media";

    var tiersEl = document.getElementById("tiers");
    tiersEl.className = "scope-panel-wrap";
    tiersEl.innerHTML =
      '<div class="scope-panel">' +
        (cat.label ? '<p class="eyebrow eyebrow--accent">' + esc(cat.label) + '</p>' : "") +
        '<p class="scope-panel__msg">' + esc(CAT.OFF_SCOPE_MESSAGE) + '</p>' +
        '<div class="scope-panel__actions">' +
          '<a class="btn btn--primary" href="' + quoteUrl({ q: query, category: cat.label, scope: "out" }) + '">Contact us <svg aria-hidden="true"><use href="#i-arrow"/></svg></a>' +
          '<a class="btn btn--ghost" href="tel:' + (window.AO_CONFIG && window.AO_CONFIG.phoneHref || "") + '"><svg aria-hidden="true"><use href="#i-phone"/></svg> Call / Text</a>' +
        "</div>" +
      "</div>";

    document.getElementById("result-note").hidden = true;
  }

  /* ---- Init ---------------------------------------------------------- */
  var params = new URLSearchParams(window.location.search);
  var query = (params.get("q") || "").trim().replace(/\s+/g, " ").slice(0, 160);
  var result = query ? CAT.detect(query) : CAT.FALLBACK;

  if (query) {
    document.getElementById("query-text").textContent = query;
    document.getElementById("query-tag").textContent = result.label || "Custom";
    document.getElementById("query-pill").hidden = false;
    var editInput = document.getElementById("edit-input");
    if (editInput) editInput.value = query;
  }

  if (result.type === "tier") renderTiers(query, result);
  else if (result.type === "industrial") renderIndustrial(query, result);
  else renderOffscope(query, result);
})();

/* ============================================================
   American Optic Media — shared behaviour (loaded on every page)
   ============================================================ */
(function () {
  "use strict";
  var CFG = window.AO_CONFIG || {};
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Footer year -------------------------------------------------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- Contact links from config --------------------------------- */
  function mailtoQuote(extra) {
    var email = CFG.email || "";
    var subject = "Video project enquiry: American Optic Media";
    var lines = ["Hi American Optic Media,", ""];
    if (extra && extra.query) lines.push('What I need: "' + extra.query + '"');
    if (extra && extra.category) lines.push("Category: " + extra.category);
    if (extra && extra.tier) lines.push("Interested tier: " + extra.tier + (extra.price ? " (" + extra.price + ")" : ""));
    lines.push("", "A bit about the project:", "");
    lines.push("Timeline:", "Budget range:", "", "Thanks!");
    return "mailto:" + email +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(lines.join("\n"));
  }

  function bookHref() {
    return CFG.calendarUrl ? CFG.calendarUrl : "quote.html";
  }

  document.querySelectorAll("[data-email-link]").forEach(function (a) {
    if (!CFG.email) return;
    a.href = "mailto:" + CFG.email;
    if (!("keepText" in a.dataset)) a.textContent = CFG.email;
  });
  document.querySelectorAll("[data-call-cta]").forEach(function (a) {
    if (CFG.phoneHref) a.href = "tel:" + CFG.phoneHref;
    if (a.hasChildNodes() && a.textContent.trim().toLowerCase() === "phone" && CFG.phone) {
      a.textContent = CFG.phone;
    }
  });
  document.querySelectorAll("[data-location]").forEach(function (el) {
    if (CFG.location) el.textContent = CFG.location;
  });
  document.querySelectorAll("[data-quote-cta]").forEach(function (a) {
    a.href = bookHref();
    a.setAttribute("target", CFG.calendarUrl ? "_blank" : "_self");
    if (CFG.calendarUrl) a.setAttribute("rel", "noopener");
  });
  // expose for results.js
  window.AO = { mailtoQuote: mailtoQuote, bookHref: bookHref, reduceMotion: reduceMotion };

  /* ---- Mobile nav toggle --------------------------------------- */
  var toggle = document.querySelector(".nav__toggle");
  var header = document.querySelector(".site-header");
  if (toggle && header) {
    toggle.addEventListener("click", function () {
      var open = header.hasAttribute("data-nav-open");
      if (open) header.removeAttribute("data-nav-open");
      else header.setAttribute("data-nav-open", "");
      toggle.setAttribute("aria-expanded", String(!open));
    });
    header.querySelectorAll(".nav__links a").forEach(function (a) {
      a.addEventListener("click", function () {
        header.removeAttribute("data-nav-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---- Reveal on scroll (progressive enhancement) ------------- */
  var reveals = document.querySelectorAll(".reveal");
  if (reveals.length && "IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    reveals.forEach(function (el, i) {
      el.style.transitionDelay = Math.min(i % 6, 5) * 55 + "ms";
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---- Ask bar: chips + submit normalisation ----------------- */
  var askForm = document.getElementById("ask-form");
  var askInput = document.getElementById("ask-input");
  var chips = document.getElementById("ask-chips");

  if (askForm && askInput) {
    askForm.addEventListener("submit", function (e) {
      var q = askInput.value.trim().replace(/\s+/g, " ");
      if (!q) { e.preventDefault(); askInput.focus(); return; }
      e.preventDefault();
      window.location.href = "results.html?q=" + encodeURIComponent(q);
    });
  }
  if (chips && askInput) {
    chips.addEventListener("click", function (e) {
      var btn = e.target.closest(".chip");
      if (!btn) return;
      askInput.value = btn.textContent.trim();
      window.location.href = "results.html?q=" + encodeURIComponent(askInput.value);
    });
  }
})();

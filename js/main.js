/* ============================================================
   American Optic Media: shared behaviour (loaded on every page)
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
    return CFG.calendarUrl ? CFG.calendarUrl : "/quote.html";
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
        if (!e.isIntersecting) return;
        var el = e.target;
        el.classList.add("is-visible");
        io.unobserve(el);
        // drop the stagger delay once revealed so hover effects respond instantly
        setTimeout(function () { el.style.transitionDelay = ""; }, 900);
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

  /* ---- Ask bar: placeholder types out example requests ------- */
  if (askInput && !reduceMotion) {
    var phrases = ["car dealership ad", "social media content", "drone site footage", "staff training video", "TV commercial", "customer testimonial"];
    var staticHint = askInput.placeholder;
    var pi = 0, ci = 0, erasing = false, typeTimer = null, typing = true;

    var typeStep = function () {
      if (!typing) return;
      var word = phrases[pi];
      if (!erasing) {
        ci++;
        askInput.placeholder = "e.g. " + word.slice(0, ci);
        if (ci === word.length) { erasing = true; typeTimer = setTimeout(typeStep, 1700); return; }
        typeTimer = setTimeout(typeStep, 60);
      } else {
        ci--;
        askInput.placeholder = "e.g. " + word.slice(0, ci);
        if (ci === 0) { erasing = false; pi = (pi + 1) % phrases.length; typeTimer = setTimeout(typeStep, 380); return; }
        typeTimer = setTimeout(typeStep, 28);
      }
    };
    askInput.addEventListener("focus", function () {
      typing = false;
      clearTimeout(typeTimer);
      askInput.placeholder = staticHint;
    });
    askInput.addEventListener("blur", function () {
      if (askInput.value) return;
      typing = true; ci = 0; erasing = false;
      clearTimeout(typeTimer);
      typeTimer = setTimeout(typeStep, 800);
    });
    typeTimer = setTimeout(typeStep, 2200);
  }

  /* ---- Hero video: autoplay muted, pause control, timecode ---- */
  var hv = document.querySelector(".hero__video");
  if (hv) {
    var hbtn = document.querySelector(".hero__toggle");
    var tcEl = document.querySelector(".hero__tc");
    var userPaused = reduceMotion; // reduced-motion visitors see the poster until they press play
    hv.muted = true;

    var syncButton = function () {
      if (!hbtn) return;
      var p = hv.paused;
      hbtn.setAttribute("data-paused", String(p));
      hbtn.setAttribute("aria-label", p ? "Play background video" : "Pause background video");
    };
    var tcPad = function (n) { return (n < 10 ? "0" : "") + n; };
    var tcTick = function () {
      if (!tcEl) return;
      var t = hv.currentTime || 0;
      var s = Math.floor(t);
      tcEl.textContent = "00:00:" + tcPad(s) + ":" + tcPad(Math.floor((t - s) * 24));
    };
    var playHero = function () {
      var p = hv.play();
      if (p && p.catch) p.catch(syncButton); // e.g. low-power mode blocks autoplay: poster stays, button shows Play
    };

    hv.addEventListener("play", syncButton);
    hv.addEventListener("pause", syncButton);
    setInterval(tcTick, 80);
    if (hbtn) {
      hbtn.addEventListener("click", function () {
        if (hv.paused) { userPaused = false; playHero(); }
        else { userPaused = true; hv.pause(); }
      });
    }
    // Save battery: pause while the hero is scrolled out of view
    var heroEl = hv.closest(".hero");
    if (heroEl && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { if (!userPaused) playHero(); }
        else hv.pause();
      }).observe(heroEl);
    } else if (!userPaused) {
      playHero();
    }
    syncButton();
  }

  /* ---- Card hover spotlight follows the pointer -------------- */
  document.addEventListener("pointermove", function (e) {
    var c = e.target.closest ? e.target.closest(".card") : null;
    if (!c) return;
    var r = c.getBoundingClientRect();
    c.style.setProperty("--mx", (e.clientX - r.left) + "px");
    c.style.setProperty("--my", (e.clientY - r.top) + "px");
  }, { passive: true });
})();

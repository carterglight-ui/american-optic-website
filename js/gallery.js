/* ============================================================
   American Optic Media — gallery coverflow effect
   Purely a visual enhancement over plain scrollable rows: every
   .gallery-row already works (scrolls, snaps) with this file absent.
   As you scroll a row, cards away from center rotate/scale/fade in
   3D. Respects prefers-reduced-motion (effect is skipped entirely).
   ============================================================ */
(function () {
  "use strict";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var rows = document.querySelectorAll(".gallery-row");
  if (!rows.length) return;

  /* ---- Prev/Next buttons (always wired, regardless of 3D effect) ---
     Hand-rolled tween instead of scrollBy({behavior:"smooth"}): some
     browser/automation contexts silently no-op the native smooth
     scroll, which would leave the buttons looking dead. setTimeout
     (not rAF, which some of those same contexts also never fire)
     keeps this working everywhere and we control the easing anyway. */
  function animateScrollBy(el, delta, duration) {
    var start = el.scrollLeft;
    var startTime = Date.now();
    function step() {
      var progress = Math.min(1, (Date.now() - startTime) / duration);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.scrollLeft = start + delta * eased;
      if (progress < 1) setTimeout(step, 16);
    }
    step();
  }

  document.querySelectorAll(".gallery-nav").forEach(function (nav) {
    var row = document.getElementById(nav.dataset.rowTarget);
    if (!row) return;
    nav.querySelectorAll(".gallery-nav__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var card = row.querySelector(".gallery-card");
        var step = (card ? card.getBoundingClientRect().width + 20 : 260) * Number(btn.dataset.dir);
        if (reduceMotion) row.scrollLeft += step;
        else animateScrollBy(row, step, 320);
      });
    });
  });

  if (reduceMotion || !("IntersectionObserver" in window)) return;

  /* ---- 3D coverflow: purely transform/opacity, rAF-throttled ------- */
  rows.forEach(function (row) {
    var cards = Array.prototype.slice.call(row.querySelectorAll(".gallery-card"));
    var ticking = false;

    function update() {
      ticking = false;
      var rect = row.getBoundingClientRect();
      var centerX = rect.left + rect.width / 2;
      var half = rect.width / 2 || 1;
      cards.forEach(function (card) {
        var cr = card.getBoundingClientRect();
        var cardCenter = cr.left + cr.width / 2;
        var delta = (cardCenter - centerX) / half;
        var clamped = Math.max(-1.6, Math.min(1.6, delta));
        var absClamped = Math.min(1, Math.abs(clamped));
        card.style.setProperty("--rotate", (clamped * -16).toFixed(2) + "deg");
        card.style.setProperty("--scale", (1 - absClamped * 0.14).toFixed(3));
        card.style.setProperty("--opacity", (1 - absClamped * 0.4).toFixed(3));
      });
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    row.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  });
})();

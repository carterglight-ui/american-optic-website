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

  /* ---- Prev/Next buttons (always wired, regardless of 3D effect) --- */
  document.querySelectorAll(".gallery-nav").forEach(function (nav) {
    var row = document.getElementById(nav.dataset.rowTarget);
    if (!row) return;
    nav.querySelectorAll(".gallery-nav__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var card = row.querySelector(".gallery-card");
        var step = card ? card.getBoundingClientRect().width + 20 : 260;
        row.scrollBy({ left: step * Number(btn.dataset.dir), behavior: reduceMotion ? "auto" : "smooth" });
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

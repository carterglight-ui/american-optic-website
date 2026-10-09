/* ============================================================
   American Optic Media: on-page media viewer
   Self-contained (injects its own CSS). Any <a data-lightbox> opens
   in a modal player instead of sending the visitor away:
     - YouTube / Shorts links play inline (youtube-nocookie embed)
     - image links open full size
   Links stay real, so with JS off, or if the embed is blocked on a
   visitor's network, they still go straight to YouTube / the photo.
   Items are grouped by the nearest [data-lightbox-group] or <ul id>,
   so Prev/Next and arrow keys move through that row.
   ============================================================ */
(function () {
  "use strict";
  if (typeof HTMLDialogElement === "undefined") return;

  var css =
    ".lightbox{border:0;padding:0;background:transparent;color:#F2F5F7;width:100vw;height:100dvh;max-width:none;max-height:none;overflow:hidden}" +
    ".lightbox::backdrop{background:rgba(4,6,9,.88);backdrop-filter:blur(10px)}" +
    ".lightbox__shell{position:absolute;inset:0;display:grid;grid-template-rows:auto 1fr auto;gap:12px;padding:16px clamp(12px,4vw,56px) 20px}" +
    ".lightbox__bar{display:flex;align-items:center;gap:12px;min-height:44px}" +
    ".lightbox__title{margin:0;flex:1;min-width:0;font:800 15px/1.2 'Archivo',system-ui,sans-serif;letter-spacing:.02em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".lightbox__ext{font:600 13px/1 'Inter',system-ui,sans-serif;color:#AEB7C2;text-decoration:none;padding:12px 14px;border:1px solid #262E38;border-radius:999px;white-space:nowrap}" +
    ".lightbox__ext:hover{color:#A0FF09;border-color:#A0FF09}" +
    ".lightbox__btn{width:44px;height:44px;flex:none;display:grid;place-items:center;border:1px solid #262E38;background:rgba(15,19,24,.8);color:#F2F5F7;border-radius:50%;cursor:pointer;transition:border-color .17s,color .17s}" +
    ".lightbox__btn:hover{border-color:#A0FF09;color:#A0FF09}" +
    ".lightbox__btn svg{width:18px;height:18px}" +
    ".lightbox__stage{position:relative;min-height:0;display:grid;place-items:center}" +
    ".lightbox__media{display:grid;place-items:center;width:100%;min-height:0}" +
    ".lightbox__frame{position:relative;width:min(100%,calc((100dvh - 190px) * 16 / 9));aspect-ratio:16/9;border-radius:16px;overflow:hidden;background:#000;box-shadow:0 40px 100px -30px #000}" +
    ".lightbox__frame--tall{width:min(100%,calc((100dvh - 190px) * 9 / 16));aspect-ratio:9/16}" +
    ".lightbox__frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0}" +
    ".lightbox__img{max-width:100%;max-height:calc(100dvh - 190px);width:auto;height:auto;border-radius:16px;box-shadow:0 40px 100px -30px #000;object-fit:contain}" +
    ".lightbox__foot{display:flex;align-items:center;justify-content:center;gap:16px;min-height:44px;font:500 13px/1.3 'Inter',system-ui,sans-serif;color:#808B99}" +
    ".lightbox__nav{position:absolute;top:50%;transform:translateY(-50%);z-index:2}" +
    ".lightbox__nav--prev{left:clamp(0px,1vw,16px)}" +
    ".lightbox__nav--next{right:clamp(0px,1vw,16px)}" +
    ".lightbox__nav--prev svg{transform:scaleX(-1)}" +
    "@media (max-width:700px){.lightbox__nav{top:auto;bottom:6px;transform:none}.lightbox__nav--prev{left:12px}.lightbox__nav--next{right:12px}.lightbox__ext span{display:none}}" +
    "html.lb-open{overflow:hidden}";

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  var ICON = {
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>'
  };

  var dlg = document.createElement("dialog");
  dlg.className = "lightbox";
  dlg.setAttribute("aria-label", "Media viewer");
  dlg.innerHTML =
    '<div class="lightbox__shell">' +
      '<div class="lightbox__bar">' +
        '<p class="lightbox__title"></p>' +
        '<a class="lightbox__ext" target="_blank" rel="noopener noreferrer"></a>' +
        '<button class="lightbox__btn lightbox__close" type="button" aria-label="Close viewer">' + ICON.close + '</button>' +
      '</div>' +
      '<div class="lightbox__stage">' +
        '<button class="lightbox__btn lightbox__nav lightbox__nav--prev" type="button" aria-label="Previous">' + ICON.arrow + '</button>' +
        '<div class="lightbox__media"></div>' +
        '<button class="lightbox__btn lightbox__nav lightbox__nav--next" type="button" aria-label="Next">' + ICON.arrow + '</button>' +
      '</div>' +
      '<div class="lightbox__foot"><span class="lightbox__count"></span></div>' +
    '</div>';
  document.body.appendChild(dlg);

  var titleEl = dlg.querySelector(".lightbox__title");
  var extEl = dlg.querySelector(".lightbox__ext");
  var mediaEl = dlg.querySelector(".lightbox__media");
  var countEl = dlg.querySelector(".lightbox__count");
  var prevBtn = dlg.querySelector(".lightbox__nav--prev");
  var nextBtn = dlg.querySelector(".lightbox__nav--next");

  var items = [];
  var index = 0;
  var opener = null;

  function parse(a) {
    var href = a.getAttribute("href") || "";
    var yt = href.match(/(?:youtu\.be\/|youtube\.com\/shorts\/|[?&]v=)([\w-]{6,})/);
    var title = a.getAttribute("data-title");
    if (!title) {
      var t = a.querySelector(".gallery-card__title, .work-tile__title");
      if (t) {
        var c = t.cloneNode(true);
        Array.prototype.forEach.call(c.querySelectorAll(".visually-hidden"), function (n) { n.remove(); });
        title = c.textContent.trim();
      }
    }
    return {
      el: a,
      href: href,
      kind: yt ? "video" : "image",
      id: yt ? yt[1] : null,
      tall: /youtube\.com\/shorts\//.test(href),
      title: title || ""
    };
  }

  function groupOf(a) {
    return a.closest("[data-lightbox-group], ul[id]") || document.body;
  }

  function render() {
    var it = items[index];
    mediaEl.innerHTML = "";
    titleEl.textContent = it.title;
    if (it.kind === "video") {
      var f = document.createElement("div");
      f.className = "lightbox__frame" + (it.tall ? " lightbox__frame--tall" : "");
      var ifr = document.createElement("iframe");
      ifr.src = "https://www.youtube-nocookie.com/embed/" + it.id + "?autoplay=1&rel=0&playsinline=1";
      ifr.title = it.title || "Video player";
      ifr.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      ifr.setAttribute("allowfullscreen", "");
      ifr.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      f.appendChild(ifr);
      mediaEl.appendChild(f);
      extEl.href = it.href;
      extEl.innerHTML = "<span>Not loading? </span>Watch on YouTube";
    } else {
      var img = document.createElement("img");
      img.className = "lightbox__img";
      img.src = it.href;
      img.alt = it.title;
      mediaEl.appendChild(img);
      extEl.href = it.href;
      extEl.textContent = "Open full size";
    }
    countEl.textContent = items.length > 1 ? (index + 1) + " of " + items.length : "";
    prevBtn.hidden = nextBtn.hidden = items.length < 2;
  }

  function open(a) {
    var links = Array.prototype.slice.call(groupOf(a).querySelectorAll("a[data-lightbox]"));
    items = links.map(parse);
    index = Math.max(0, links.indexOf(a));
    opener = a;
    render();
    if (!dlg.open) dlg.showModal();
    document.documentElement.classList.add("lb-open");
  }

  function step(d) {
    if (items.length < 2) return;
    index = (index + d + items.length) % items.length;
    render();
  }

  function close() { if (dlg.open) dlg.close(); }

  dlg.addEventListener("close", function () {
    mediaEl.innerHTML = ""; // stops playback
    document.documentElement.classList.remove("lb-open");
    if (opener && opener.focus) opener.focus();
  });
  dlg.addEventListener("click", function (e) {
    var c = e.target.classList;
    if (e.target === dlg || c.contains("lightbox__shell") || c.contains("lightbox__stage") || c.contains("lightbox__media")) close();
  });
  dlg.querySelector(".lightbox__close").addEventListener("click", close);
  prevBtn.addEventListener("click", function () { step(-1); });
  nextBtn.addEventListener("click", function () { step(1); });
  dlg.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
  });

  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest("a[data-lightbox]");
    if (!a) return;
    e.preventDefault();
    open(a);
  });
})();

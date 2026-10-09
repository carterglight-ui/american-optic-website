/* ============================================================
   American Optic Media: quote / contact form
   Sends to your inbox through the endpoint in js/site-config.js
   (FormSubmit). If that ever fails (not yet activated, offline,
   service down), it falls back to opening the visitor's email app
   pre-filled, so a lead is never silently lost.
   ============================================================ */
(function () {
  "use strict";
  var CFG = window.AO_CONFIG || {};
  var CAT = window.AO_CATALOG;

  var params = new URLSearchParams(window.location.search);
  var q = (params.get("q") || "").trim();
  var category = (params.get("category") || "").trim();
  var tier = (params.get("tier") || "").trim();
  var price = (params.get("price") || "").trim();
  var scope = (params.get("scope") || "").trim();

  /* ---- Tailor the intro copy to how the visitor got here ---------- */
  var titleEl = document.getElementById("quote-title");
  var blurbEl = document.getElementById("quote-blurb");
  var projectField = document.getElementById("f-project");
  var messageField = document.getElementById("f-message");
  var contextField = document.getElementById("field-context");

  var contextLine = "";
  if (scope === "out") {
    titleEl.textContent = "Let’s find you the right fit";
    blurbEl.textContent = (CAT && CAT.OFF_SCOPE_MESSAGE) ||
      "We may not specialize in this area, but contact us so we can better understand your vision to build you a custom quote or refer you to someone who can.";
    contextLine = category ? "Enquiry type: " + category + (q ? " (“" + q + "”)" : "") : (q ? "Enquiry: “" + q + "”" : "");
  } else if (category && tier) {
    titleEl.textContent = "Let’s get you an exact quote";
    blurbEl.textContent = "You were looking at the " + tier + " estimate (~$" + Number(price || 0).toLocaleString("en-US") + ") for " + category + ". Every quote is custom, and the details below help us nail the number.";
    contextLine = "Interested in: " + category + ", " + tier + " (~$" + Number(price || 0).toLocaleString("en-US") + ")" + (q ? '\nOriginal request: "' + q + '"' : "");
  } else if (category) {
    titleEl.textContent = "Let’s build your quote";
    blurbEl.textContent = "Tell us about the " + category.toLowerCase() + " project and we'll follow up with exact pricing.";
    contextLine = "Project type: " + category + (q ? ' ("' + q + '")' : "");
  } else if (q) {
    contextLine = 'Original request: "' + q + '"';
  }

  if (contextField) contextField.value = contextLine;
  if (projectField && !projectField.value) projectField.value = category || q || "";
  if (messageField && contextLine && !messageField.value) {
    messageField.value = contextLine + "\n\n";
  }

  /* ---- Direct contact details -------------------------------------- */
  var asidePhone = document.getElementById("aside-phone");
  var asideEmail = document.getElementById("aside-email");
  if (asidePhone && CFG.phone) asidePhone.textContent = CFG.phone;
  if (asideEmail && CFG.email) asideEmail.textContent = CFG.email;

  /* ---- Submission ---------------------------------------------------- */
  var form = document.getElementById("quote-form");
  var statusEl = document.getElementById("form-status");
  var noteEl = document.getElementById("form-note");
  var submitBtn = document.getElementById("quote-submit");
  var successEl = document.getElementById("form-success");

  if (!CFG.formEndpoint && noteEl) {
    noteEl.hidden = false;
    noteEl.textContent = "Hitting send opens your email app with this pre-filled to " + (CFG.email || "us") + ". Review it and hit send there.";
  }

  function setStatus(msg, kind) {
    statusEl.textContent = msg;
    statusEl.className = kind || "";
  }

  function buildMailto(data) {
    var subject = "Quote request" + (category ? ": " + category : "") + (tier ? " (" + tier + ")" : "");
    var lines = [
      "Name: " + data.name,
      "Email: " + data.email,
      data.phone ? "Phone: " + data.phone : null,
      data.business ? "Business: " + data.business : null,
      data.project ? "Looking for: " + data.project : null,
      "",
      data.message
    ].filter(function (l) { return l !== null; });
    return "mailto:" + (CFG.email || "") +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(lines.join("\n"));
  }

  function showSent() {
    form.hidden = true;
    if (successEl) {
      successEl.hidden = false;
      successEl.focus();
    }
    if (titleEl) titleEl.textContent = "Thanks, we've got it";
    if (blurbEl) blurbEl.textContent = "Your message is on its way to us.";
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function fallbackToEmailApp(data) {
    var mail = buildMailto(data);
    statusEl.className = "err";
    statusEl.innerHTML =
      "We couldn't send that automatically, so we're opening your email app with everything filled in. " +
      'If nothing opens, <a href="' + mail + '">tap here to email us</a>' +
      (CFG.phoneHref ? ' or call or text <a href="tel:' + CFG.phoneHref + '">' + (CFG.phone || CFG.phoneHref) + "</a>." : ".");
    submitBtn.disabled = false;
    window.location.href = mail;
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var el = form.elements;

      // Bots fill the hidden trap field; people never see it. Pretend it worked.
      if (el["_honey"] && el["_honey"].value) { showSent(); return; }

      var data = {
        name: el["name"].value.trim(),
        email: el["email"].value.trim(),
        phone: el["phone"].value.trim(),
        business: el["business"].value.trim(),
        project: el["project"].value.trim(),
        message: el["message"].value.trim()
      };

      submitBtn.disabled = true;

      if (!CFG.formEndpoint) {
        setStatus("Opening your email app…");
        window.location.href = buildMailto(data);
        submitBtn.disabled = false;
        return;
      }

      setStatus("Sending…");
      var fd = new FormData(form);
      fd.set("_replyto", data.email);
      fd.set("_subject", "New quote request: " + (data.project || category || "General") + " (" + data.name + ")");

      fetch(CFG.formEndpoint, { method: "POST", headers: { Accept: "application/json" }, body: fd })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (json) {
            return { ok: res.ok, json: json };
          });
        })
        .then(function (r) {
          if (r.ok && String(r.json.success) !== "false") {
            setStatus("");
            showSent();
          } else {
            throw new Error("not accepted");
          }
        })
        .catch(function () { fallbackToEmailApp(data); });
    });
  }
})();

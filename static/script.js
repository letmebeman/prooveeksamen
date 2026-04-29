/**
 * script.js – NordTek Solutions AS Internal Portal
 *
 * Responsibilities:
 *  1. Tab / section navigation
 *  2. System Status: fetch & render service cards, auto-refresh
 *  3. Logg feil: form validation & submission via fetch API
 *  4. Misc: set copyright year in footer
 */

/* ============================================================
   1. CONSTANTS & DOM REFERENCES
   ============================================================ */

const STATUS_REFRESH_MS = 60_000; // auto-refresh every 60 seconds

/** Map raw status strings → CSS modifier and Norwegian label */
const STATUS_MAP = {
  operational: { mod: "operational", label: "Operativ" },
  degraded:    { mod: "degraded",    label: "Degradert" },
  down:        { mod: "down",        label: "Nede" },
};

/* ============================================================
   2. SECTION / TAB NAVIGATION
   ============================================================ */

/**
 * Activate a named section and update the nav buttons.
 * @param {string} sectionId  e.g. "status", "guide", "logg"
 */
function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll(".section").forEach((el) => {
    el.classList.remove("section--active");
  });

  // Deactivate all nav buttons
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.remove("active");
    btn.removeAttribute("aria-current");
  });

  // Show the target section
  const target = document.getElementById(`section-${sectionId}`);
  if (target) target.classList.add("section--active");

  // Mark the active nav button
  const activeBtn = document.querySelector(`.nav-btn[data-section="${sectionId}"]`);
  if (activeBtn) {
    activeBtn.classList.add("active");
    activeBtn.setAttribute("aria-current", "page");
  }
}

// Wire up navigation buttons
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const section = btn.dataset.section;
    showSection(section);

    // If navigating to Status section, refresh immediately
    if (section === "status") fetchStatus();
  });
});

/* ============================================================
   3. SYSTEM STATUS
   ============================================================ */

/**
 * Fetch service status from the Flask API and render the results.
 */
async function fetchStatus() {
  const grid        = document.getElementById("service-grid");
  const banner      = document.getElementById("overall-banner");
  const bannerIcon  = document.getElementById("overall-icon");
  const bannerText  = document.getElementById("overall-text");
  const lastUpdated = document.getElementById("last-updated");

  try {
    const response = await fetch("/api/status");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    // Render service cards
    grid.innerHTML = data.services
      .map((svc) => buildServiceCard(svc))
      .join("");

    // Determine overall health
    const hasDown     = data.services.some((s) => s.status === "down");
    const hasDegraded = data.services.some((s) => s.status === "degraded");

    if (hasDown) {
      setBanner(banner, bannerIcon, bannerText, "banner--error", "✕",
        "Kritisk – én eller flere tjenester er nede");
    } else if (hasDegraded) {
      setBanner(banner, bannerIcon, bannerText, "banner--warn", "⚠",
        "Advarsel – noen tjenester er degradert");
    } else {
      setBanner(banner, bannerIcon, bannerText, "banner--ok", "✓",
        "Alle systemer operative");
    }

    if (lastUpdated) {
      lastUpdated.textContent = `Sist oppdatert: ${data.updated}`;
    }

  } catch (err) {
    console.error("Kunne ikke hente status:", err);
    setBanner(banner, bannerIcon, bannerText, "banner--error", "✕",
      "Kunne ikke laste status – prøv igjen.");
    grid.innerHTML = '<p style="color:var(--color-text-muted)">Ingen data tilgjengelig.</p>';
  }
}

/**
 * Build the HTML string for a single service card.
 * @param {{ name: string, status: string, uptime: string }} svc
 * @returns {string}
 */
function buildServiceCard(svc) {
  const info = STATUS_MAP[svc.status] || { mod: "down", label: svc.status };
  return `
    <div class="service-card service-card--${info.mod}">
      <div class="service-card__name">${escapeHtml(svc.name)}</div>
      <div class="service-card__footer">
        <span class="status-badge status-badge--${info.mod}">${info.label}</span>
        <span class="service-uptime">Oppetid: ${escapeHtml(svc.uptime)}</span>
      </div>
    </div>`;
}

/**
 * Update the overall-status banner.
 */
function setBanner(bannerEl, iconEl, textEl, modClass, icon, message) {
  // Remove old state classes
  bannerEl.classList.remove("banner--loading", "banner--ok", "banner--warn", "banner--error");
  bannerEl.classList.add(modClass);
  iconEl.textContent = icon;
  textEl.textContent = message;
}

// Initial load + auto-refresh
fetchStatus();
setInterval(fetchStatus, STATUS_REFRESH_MS);

/* ============================================================
   4. LOGG FEIL – FORM SUBMISSION
   ============================================================ */

const errorForm    = document.getElementById("error-form");
const feedbackEl   = document.getElementById("form-feedback");
const submitBtn    = document.getElementById("submit-btn");
const submitLabel  = document.getElementById("submit-label");
const submitSpinner = document.getElementById("submit-spinner");

errorForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Collect form data
  const formData = {
    name:        errorForm.elements["name"].value.trim(),
    email:       errorForm.elements["email"].value.trim(),
    category:    errorForm.elements["category"].value,
    description: errorForm.elements["description"].value.trim(),
  };

  // Client-side validation
  if (!formData.name || !formData.email || !formData.category || !formData.description) {
    showFeedback("Fyll inn alle obligatoriske felter.", false);
    return;
  }

  if (!isValidEmail(formData.email)) {
    showFeedback("Ugyldig e-postadresse.", false);
    return;
  }

  // Show loading state
  setSubmitLoading(true);
  hideFeedback();

  try {
    const res = await fetch("/api/log-error", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(formData),
    });

    const json = await res.json();

    if (json.success) {
      showFeedback(`${json.message} (Referanse #${json.id})`, true);
      errorForm.reset();
    } else {
      showFeedback(json.message || "Noe gikk galt, prøv igjen.", false);
    }
  } catch (err) {
    console.error("Innsending feilet:", err);
    showFeedback("Nettverksfeil – sjekk tilkoblingen og prøv igjen.", false);
  } finally {
    setSubmitLoading(false);
  }
});

/** Show the inline feedback message. */
function showFeedback(message, success) {
  feedbackEl.textContent = message;
  feedbackEl.className   = `form-feedback form-feedback--${success ? "success" : "error"}`;
  feedbackEl.hidden      = false;
  feedbackEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/** Hide the inline feedback message. */
function hideFeedback() {
  feedbackEl.hidden = true;
  feedbackEl.textContent = "";
}

/** Toggle loading state on the submit button. */
function setSubmitLoading(isLoading) {
  submitBtn.disabled        = isLoading;
  submitLabel.textContent   = isLoading ? "Sender…" : "Send inn rapport";
  submitSpinner.hidden      = !isLoading;
  submitSpinner.setAttribute("aria-hidden", String(!isLoading));
}

/* ============================================================
   5. UTILITY HELPERS
   ============================================================ */

/**
 * Escape HTML special characters to prevent XSS when injecting server data.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Basic e-mail format validation.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ============================================================
   6. FOOTER – COPYRIGHT YEAR
   ============================================================ */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

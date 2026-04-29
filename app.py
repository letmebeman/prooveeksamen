"""
app.py – Main Flask application for NordTek Solutions AS internal portal.
Handles routing for the main portal page, system status API, and error logging.
"""

import os
from flask import Flask, flash, jsonify, redirect, render_template, request, url_for
from datetime import datetime

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-key")

# ---------------------------------------------------------------------------
# In-memory store for logged errors (replace with a database in production)
# ---------------------------------------------------------------------------
logged_errors = []

# ---------------------------------------------------------------------------
# Static system-status data – update or replace with live monitoring calls
# ---------------------------------------------------------------------------
SERVICES = [
    {"name": "Web Hosting – Kunde A",  "status": "operational",  "uptime": "99.98%"},
    {"name": "Web Hosting – Kunde B",  "status": "operational",  "uptime": "99.95%"},
    {"name": "E-post Server",          "status": "degraded",     "uptime": "97.12%"},
    {"name": "Backup-tjeneste",        "status": "operational",  "uptime": "100%"},
    {"name": "DNS / Domene",           "status": "operational",  "uptime": "99.99%"},
    {"name": "Overvåking (Monitoring)","status": "operational",  "uptime": "99.90%"},
]

STATUS_MAP = {
    "operational": {"mod": "operational", "label": "Operativ"},
    "degraded": {"mod": "degraded", "label": "Degradert"},
    "down": {"mod": "down", "label": "Nede"},
}


def decorate_services(services):
    """Attach presentation metadata to each service for the template."""
    decorated = []
    for service in services:
        meta = STATUS_MAP.get(service["status"], {"mod": "down", "label": service["status"]})
        decorated.append({**service, "status_mod": meta["mod"], "status_label": meta["label"]})
    return decorated


def build_banner(services):
    """Build the overall status banner from the current service list."""
    statuses = [service["status"] for service in services]

    if "down" in statuses:
        return {"class": "banner--error", "icon": "✕", "message": "Kritisk – én eller flere tjenester er nede"}
    if "degraded" in statuses:
        return {"class": "banner--warn", "icon": "⚠", "message": "Advarsel – noen tjenester er degradert"}
    return {"class": "banner--ok", "icon": "✓", "message": "Alle systemer operative"}


def store_error(data):
    """Validate and persist a submitted error report."""
    required = ["name", "email", "category", "description"]
    payload = {field: (data.get(field, "") or "").strip() for field in required}

    for field in required:
        if not payload[field]:
            return False, f"Feltet '{field}' er påkrevd.", None

    entry = {
        "id": len(logged_errors) + 1,
        "timestamp": datetime.now().strftime("%d.%m.%Y %H:%M"),
        **payload,
    }
    logged_errors.append(entry)
    return True, "Feilen er registrert. Takk!", entry["id"]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    """Render the main portal page."""
    active_section = request.args.get("section", "status")
    services = decorate_services(SERVICES)
    return render_template(
        "index.html",
        active_section=active_section,
        services=services,
        banner=build_banner(SERVICES),
        updated=datetime.now().strftime("%d.%m.%Y %H:%M"),
        current_year=datetime.now().year,
    )


@app.route("/api/status")
def api_status():
    """
    Returns a JSON list of service statuses.
    Front-end fetches this to populate the System Status section.
    """
    return jsonify({"services": SERVICES, "updated": datetime.now().strftime("%d.%m.%Y %H:%M")})


@app.route("/api/log-error", methods=["POST"])
def api_log_error():
    """
    Accepts a JSON payload from the 'Logg feil' form and stores it.
    Expected fields: name, email, category, description
    """
    data = request.get_json(silent=True) or request.form
    if not data:
        return jsonify({"success": False, "message": "Ingen data mottatt."}), 400

    success, message, entry_id = store_error(data)
    if not success:
        return jsonify({"success": False, "message": message}), 400

    return jsonify({"success": True, "message": message, "id": entry_id})


@app.route("/log-error", methods=["POST"])
def log_error():
    """Handle the browser form submission without JavaScript."""
    success, message, _ = store_error(request.form)
    flash(message, "success" if success else "error")
    return redirect(url_for("index", section="logg"))


@app.route("/api/errors")
def api_errors():
    """Returns all logged errors (for internal admin use)."""
    return jsonify({"errors": logged_errors})


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # Enable debug mode only when FLASK_DEBUG=1 is set in the environment.
    # Never run with debug=True in production.
    debug_mode = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(debug=debug_mode, host="0.0.0.0", port=5000)

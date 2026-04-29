"""
app.py – Main Flask application for NordTek Solutions AS internal portal.
Handles routing for the main portal page, system status API, and error logging.
"""

import os
from flask import Flask, render_template, request, jsonify
from datetime import datetime

app = Flask(__name__)

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


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    """Render the main portal page."""
    return render_template("index.html")


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
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"success": False, "message": "Ingen data mottatt."}), 400

    # Basic validation
    required = ["name", "email", "category", "description"]
    for field in required:
        if not data.get(field, "").strip():
            return jsonify({"success": False, "message": f"Feltet '{field}' er påkrevd."}), 400

    entry = {
        "id": len(logged_errors) + 1,
        "timestamp": datetime.now().strftime("%d.%m.%Y %H:%M"),
        **{k: data[k].strip() for k in required},
    }
    logged_errors.append(entry)

    return jsonify({"success": True, "message": "Feilen er registrert. Takk!", "id": entry["id"]})


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

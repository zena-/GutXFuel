#!/usr/bin/env python3
import json
import os
import re
from datetime import datetime, timezone
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import parse_qs

ROOT = os.path.dirname(os.path.abspath(__file__))
SUBSCRIBERS_PATH = os.path.join(ROOT, "subscribers.json")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def _send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        # Mirrors the Netlify Forms endpoint used in production (POST "/"
        # with an url-encoded body) so the signup form works in local dev too.
        if self.path not in ("/", "/api/subscribe"):
            self._send_json(404, {"ok": False, "error": "not found"})
            return

        length = int(self.headers.get("Content-Length", 0) or 0)
        raw = self.rfile.read(length) if length else b""
        content_type = self.headers.get("Content-Type", "")

        if "application/json" in content_type:
            try:
                data = json.loads(raw or b"{}")
            except json.JSONDecodeError:
                self._send_json(400, {"ok": False, "error": "invalid json"})
                return
        else:
            data = {k: v[0] for k, v in parse_qs(raw.decode("utf-8")).items()}

        email = str(data.get("email", "")).strip().lower()
        if not EMAIL_RE.match(email):
            self._send_json(400, {"ok": False, "error": "invalid email"})
            return

        subscribers = []
        if os.path.exists(SUBSCRIBERS_PATH):
            try:
                with open(SUBSCRIBERS_PATH, "r", encoding="utf-8") as f:
                    subscribers = json.load(f)
            except (json.JSONDecodeError, OSError):
                subscribers = []

        if any(s.get("email") == email for s in subscribers):
            self._send_json(200, {"ok": True, "already_subscribed": True})
            return

        subscribers.append({
            "email": email,
            "subscribed_at": datetime.now(timezone.utc).isoformat(),
        })
        with open(SUBSCRIBERS_PATH, "w", encoding="utf-8") as f:
            json.dump(subscribers, f, indent=2)

        self._send_json(200, {"ok": True})

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5552))
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"GutXFuel dev server running at http://localhost:{port}")
    server.serve_forever()

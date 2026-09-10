#!/usr/bin/env python3
"""Local preview server for this site.

Python's http.server sends only Last-Modified, so browsers apply heuristic caching and will
happily keep serving an edited file without revalidating. That cost a confusing hour once:
a JS file was restored on disk while the browser kept running the old one. This sends
no-store, so what you reload is always what is on disk.

    python serve.py [port]     # default 8080
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, *args):
        pass  # quiet


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    print(f"serving {__file__.rsplit('/', 1)[0] or '.'} on http://localhost:{port} (no-store)")
    ThreadingHTTPServer(("127.0.0.1", port), NoCacheHandler).serve_forever()

"""PWA assets for benchmark runs and the dashboard. Stdlib only.

Each run folder gets, next to the model's index.html (which is never edited):
  manifest.webmanifest   install metadata (name, colours, start_url ./index.html)
  sw.js                  service worker: cache-first, so the run works offline after one visit
  icons/icon-192.png     install icons, generated here as PNG
  icons/icon-512.png

The model's HTML links those files (the prompt tells it to). ensure_run() only writes files
that are missing, so a hand-edited asset is never overwritten. Also records in meta.json
whether the uploaded HTML actually links the manifest and registers the worker.
"""
import colorsys
import json
import re
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

RUN_SW = """// Benchmark run service worker: cache-first, so the run works offline after one visit.
const CACHE = "__CACHE__";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      // Cache same-origin responses and opaque cross-origin ones (CDN libraries such as three.js).
      if (res.ok || res.type === "opaque") {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match("./index.html")))
  );
});
"""

ROOT_SW = """// Dashboard service worker: network-first, falls back to the cached shell when offline.
// Run apps under /runs/ have their own workers, so they are passed through untouched.
const CACHE = "modelbench-dashboard-v1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./manifest.json", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.includes("/runs/")) return;
  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then((res) => {
        if (res.ok) caches.open(CACHE).then((c) => c.put(event.request, res.clone()));
        return res;
      })
      .catch(() => caches.match(event.request).then((hit) => hit || caches.match("./index.html")))
  );
});
"""


def hex_from_hue(hue: float, sat: float, light: float) -> str:
    r, g, b = colorsys.hls_to_rgb((hue % 360) / 360.0, light, sat)
    return "#%02x%02x%02x" % (round(r * 255), round(g * 255), round(b * 255))


def rgb(hex_colour: str):
    h = hex_colour.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def png_icon(size: int, top, bottom) -> bytes:
    """A play-triangle glyph on a vertical gradient. Stdlib PNG encoder (8-bit RGB)."""
    (x1, y1), (x2, y2), (x3, y3) = (0.37, 0.29), (0.37, 0.71), (0.71, 0.50)

    def side(px, py, ax, ay, bx, by):
        return (px - bx) * (ay - by) - (ax - bx) * (py - by)

    def inside(px, py):
        d1 = side(px, py, x1, y1, x2, y2)
        d2 = side(px, py, x2, y2, x3, y3)
        d3 = side(px, py, x3, y3, x1, y1)
        has_neg = d1 < 0 or d2 < 0 or d3 < 0
        has_pos = d1 > 0 or d2 > 0 or d3 > 0
        return not (has_neg and has_pos)

    white = (255, 255, 255)
    raw = bytearray()
    for y in range(size):
        t = y / (size - 1)
        bg = bytes(round(top[i] * (1 - t) + bottom[i] * t) for i in range(3))
        raw.append(0)  # filter type: none
        py = (y + 0.5) / size
        for x in range(size):
            px = (x + 0.5) / size
            raw += bytes(white) if inside(px, py) else bg

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
            + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b""))


def _write_if_missing(path: Path, data) -> bool:
    if path.exists():
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(data, bytes):
        path.write_bytes(data)
    else:
        path.write_text(data, encoding="utf-8", newline="\n")
    return True


def _icons(folder: Path, top, bottom) -> None:
    for size in (192, 512):
        _write_if_missing(folder / "icons" / f"icon-{size}.png", png_icon(size, top, bottom))


def _manifest(name: str, short: str, description: str, theme: str, background: str, start: str) -> str:
    manifest = {
        "name": name,
        "short_name": short[:12],
        "description": description,
        "id": start,
        "start_url": start,
        "scope": "./",
        "display": "standalone",
        "orientation": "any",
        "background_color": background,
        "theme_color": theme,
        "icons": [
            {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
            {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
        ],
    }
    return json.dumps(manifest, indent=2) + "\n"


def ensure_run(run_dir: Path, title: str, description: str, hue: float) -> dict:
    """Create the install assets for one run if they are missing. Returns what was linked by the model."""
    accent = hex_from_hue(hue, 0.72, 0.55)
    dark = hex_from_hue(hue, 0.55, 0.14)
    _write_if_missing(run_dir / "manifest.webmanifest",
                      _manifest(title, title.split(" ·")[0], description, accent, dark, "./index.html"))
    _write_if_missing(run_dir / "sw.js", RUN_SW.replace("__CACHE__", f"mb-{run_dir.name}-v1"))
    _icons(run_dir, rgb(accent), rgb(dark))
    return linked_status(run_dir / "index.html")


def ensure_root(root: Path = ROOT) -> None:
    """Dashboard install assets at the repo root (served at the Pages root)."""
    accent, dark = "#8b7bff", "#0a0c11"
    _write_if_missing(root / "manifest.webmanifest",
                      _manifest("ModelBench · open-ended tests for AI models", "ModelBench",
                                "Ten to twelve open-ended tests for AI models, with a viewer for every run.",
                                accent, dark, "./index.html"))
    _write_if_missing(root / "sw.js", ROOT_SW)
    _icons(root, rgb(accent), rgb(dark))


_MANIFEST_LINK = re.compile(r"""<link[^>]+rel=["']manifest["']""", re.I)
_SW_REGISTER = re.compile(r"serviceWorker\.register\(", re.I)


def linked_status(index_html: Path) -> dict:
    """Does the model's HTML link a manifest and register a service worker? (read-only)"""
    if not index_html.exists():
        return {"manifest_linked": False, "sw_registered": False, "note": "no index.html"}
    text = index_html.read_text(encoding="utf-8", errors="replace")
    return {"manifest_linked": bool(_MANIFEST_LINK.search(text)),
            "sw_registered": bool(_SW_REGISTER.search(text))}


if __name__ == "__main__":
    ensure_root()
    print("dashboard PWA assets ensured")

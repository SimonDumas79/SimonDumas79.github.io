# simondumas.dev

My portfolio site. Static HTML, CSS and JavaScript, no build step and no dependencies.

Served by GitHub Pages from `main` at https://simondumas.dev.

## Preview locally

```
python serve.py [port]
```

Defaults to port 8000. Use this instead of `python -m http.server`, which caches
edited files and will serve you a stale copy without telling you.

## Layout

- `index.html` — the whole page
- `css/style.css` — all styles
- `js/mesh.js` — the animated backdrop
- `js/glow.js` — the light that follows the cursor
- `js/shots.js`, `js/detail.js`, `js/main.js` — screenshot strip, detail cards, section fades
- `media/` — screenshots

// Backdrop: a faint Delaunay mesh, ScreenSpace's territory look. Drawn once per resize and then
// left alone. The light that follows the cursor lives in the panels now (glow.js), not out here,
// so there is no per-frame work and no loop: this file paints and stops.
(() => {
  const canvas = document.getElementById('mesh');
  const ctx = canvas.getContext('2d');
  const BLUE = '77, 77, 255';
  const CELL = 120;    // average point spacing, px
  const JITTER = 0.45; // fraction of a cell each point may wander
  const ALPHA = 0.09;  // line alpha

  let W = 0, H = 0, dpr = 1;

  // Jittered grid, extended past the viewport so no edge slivers show
  function makePoints() {
    const pts = [];
    const cols = Math.ceil(W / CELL) + 3, rows = Math.ceil(H / CELL) + 3;
    let seed = 1337;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let r = -1; r < rows - 1; r++) {
      for (let c = -1; c < cols - 1; c++) {
        pts.push([
          (c + 0.5 + (rnd() - 0.5) * 2 * JITTER) * CELL,
          (r + 0.5 + (rnd() - 0.5) * 2 * JITTER) * CELL
        ]);
      }
    }
    return pts;
  }

  // Bowyer-Watson Delaunay. Returns index triangles.
  function delaunay(pts) {
    const n = pts.length;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of pts) {
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    const d = Math.max(maxX - minX, maxY - minY) * 10;
    const mx = (minX + maxX) / 2, my = (minY + maxY) / 2;
    const P = pts.concat([[mx - d, my - d], [mx, my + d], [mx + d, my - d]]);

    const circ = (a, b, c) => {
      const [ax, ay] = P[a], [bx, by] = P[b], [cx, cy] = P[c];
      const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
      const a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
      const ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / D;
      const uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / D;
      return { x: ux, y: uy, r2: (ax - ux) * (ax - ux) + (ay - uy) * (ay - uy) };
    };
    const mk = (a, b, c) => ({ v: [a, b, c], cc: circ(a, b, c) });

    let tris = [mk(n, n + 1, n + 2)];
    for (let i = 0; i < n; i++) {
      const [px, py] = P[i];
      const bad = [], keep = [];
      for (const t of tris) {
        const dx = px - t.cc.x, dy = py - t.cc.y;
        (dx * dx + dy * dy < t.cc.r2 ? bad : keep).push(t);
      }
      // hole boundary = edges that belong to exactly one bad triangle
      const count = new Map();
      for (const t of bad) {
        for (let k = 0; k < 3; k++) {
          const a = t.v[k], b = t.v[(k + 1) % 3];
          const key = a < b ? a + ',' + b : b + ',' + a;
          count.set(key, (count.get(key) || 0) + 1);
        }
      }
      for (const [key, c] of count) {
        if (c !== 1) continue;
        const [a, b] = key.split(',').map(Number);
        keep.push(mk(a, b, i));
      }
      tris = keep;
    }
    return tris.filter(t => t.v[0] < n && t.v[1] < n && t.v[2] < n).map(t => t.v);
  }

  // Every unique edge, stroked in one path
  function draw() {
    const pts = makePoints();
    const tris = delaunay(pts);
    const seen = new Set();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(' + BLUE + ', ' + ALPHA + ')';
    ctx.beginPath();
    for (const [a, b, c] of tris) {
      for (const [u, v] of [[a, b], [b, c], [c, a]]) {
        const key = u < v ? u + ',' + v : v + ',' + u;
        if (seen.has(key)) continue;
        seen.add(key);
        ctx.moveTo(pts[u][0], pts[u][1]);
        ctx.lineTo(pts[v][0], pts[v][1]);
      }
    }
    ctx.stroke();
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    draw();
  }

  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); });
  resize();
})();

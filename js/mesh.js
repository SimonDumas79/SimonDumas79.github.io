// Backdrop: a faint Delaunay mesh (ScreenSpace's territory look) whose edges glow near the cursor.
(() => {
  const canvas = document.getElementById('mesh');
  const ctx = canvas.getContext('2d');
  const BLUE = '77, 77, 255';
  const CELL = 120;        // average point spacing, px
  const JITTER = 0.45;     // fraction of a cell each point may wander
  const BASE_ALPHA = 0.09; // resting line alpha
  const GLOW_RADIUS = 260; // px from cursor

  let W = 0, H = 0, dpr = 1;
  let edges = [];          // [x0, y0, x1, y1]
  let mouse = null;        // {x, y} in CSS px, or null when off-page
  let dirty = true;
  let raf = 0;

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

  function build() {
    const pts = makePoints();
    const tris = delaunay(pts);
    const seen = new Set();
    edges = [];
    for (const [a, b, c] of tris) {
      for (const [u, v] of [[a, b], [b, c], [c, a]]) {
        const key = u < v ? u + ',' + v : v + ',' + u;
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push([pts[u][0], pts[u][1], pts[v][0], pts[v][1]]);
      }
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
    dirty = true;
    schedule();
  }

  // Squared distance from a point to a segment
  function segDist2(px, py, x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    const l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - x0) * dx + (py - y0) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    const qx = x0 + t * dx - px, qy = y0 + t * dy - py;
    return qx * qx + qy * qy;
  }
  const smooth = t => t * t * (3 - 2 * t);

  function draw() {
    raf = 0;
    if (!dirty) return;
    dirty = false;
    ctx.clearRect(0, 0, W, H);

    // Base pass: every edge, faint
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(' + BLUE + ', ' + BASE_ALPHA + ')';
    ctx.beginPath();
    for (const e of edges) { ctx.moveTo(e[0], e[1]); ctx.lineTo(e[2], e[3]); }
    ctx.stroke();

    // Glow pass: edges near the cursor, alpha falling off with distance
    if (!mouse) return;
    const R = GLOW_RADIUS, R2 = R * R;
    const near = [];
    for (const e of edges) {
      const d2 = segDist2(mouse.x, mouse.y, e[0], e[1], e[2], e[3]);
      if (d2 < R2) near.push([e, smooth(1 - Math.sqrt(d2) / R)]);
    }
    // bloom under-stroke first, then the bright line
    ctx.lineWidth = 6;
    for (const [e, a] of near) {
      ctx.strokeStyle = 'rgba(' + BLUE + ', ' + (a * 0.22).toFixed(3) + ')';
      ctx.beginPath(); ctx.moveTo(e[0], e[1]); ctx.lineTo(e[2], e[3]); ctx.stroke();
    }
    ctx.lineWidth = 1.5;
    for (const [e, a] of near) {
      ctx.strokeStyle = 'rgba(' + BLUE + ', ' + (a * 0.9).toFixed(3) + ')';
      ctx.beginPath(); ctx.moveTo(e[0], e[1]); ctx.lineTo(e[2], e[3]); ctx.stroke();
    }
  }

  function schedule() { if (!raf) raf = requestAnimationFrame(draw); }

  // Always listen: touch-only devices simply never fire mousemove, and a tablet with a mouse
  // attached can still report a coarse primary pointer, which would wrongly disable the glow.
  window.addEventListener('mousemove', e => {
    mouse = { x: e.clientX, y: e.clientY };
    dirty = true;
    schedule();
  }, { passive: true });
  document.addEventListener('mouseleave', () => { mouse = null; dirty = true; schedule(); });
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); });
  resize();
})();

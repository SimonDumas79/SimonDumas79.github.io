// Pulls evenly spaced stills out of a local video with headless Chrome over CDP (no ffmpeg on this PC).
//   node frames.mjs <video.mp4> <outDir> [count=12]
// Writes frame-01.png ... at native resolution, plus sheet.jpg: a numbered contact sheet for picking.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const [video, outDir, countArg] = process.argv.slice(2);
const count = Number(countArg || 12);
mkdirSync(outDir, { recursive: true });
const blank = path.join(outDir, 'blank.html');
writeFileSync(blank, '<!doctype html><body style="margin:0;background:#000">');

const port = 9334;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--allow-file-access-from-files', // file:// video stays same-origin, so the canvas is not tainted
  `--remote-debugging-port=${port}`, `--user-data-dir=${process.env.TEMP}\\frames-cdp`, pathToFileURL(blank).href,
], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

let targets = [];
for (let i = 0; i < 60 && !targets.some(t => t.type === 'page'); i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch {}
  await sleep(250);
}
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const evaluate = expression => new Promise((resolve, reject) => {
  const i = ++id;
  pending.set(i, m => {
    const d = m.result?.exceptionDetails;
    d ? reject(new Error(d.exception?.description || d.text)) : resolve(m.result.result.value);
  });
  ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
});
const save = (file, dataUrl) => writeFileSync(path.join(outDir, file), Buffer.from(dataUrl.split(',')[1], 'base64'));

try {
  const info = await evaluate(`(async () => {
    const v = window.v = document.createElement('video');
    v.muted = true; v.preload = 'auto'; v.src = ${JSON.stringify(pathToFileURL(video).href)};
    await new Promise((ok, fail) => { v.onloadeddata = ok; v.onerror = () => fail(new Error('video error ' + v.error?.code)); });
    const c = window.c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    const cols = 4, tw = 480, th = Math.round(tw * v.videoHeight / v.videoWidth);
    const s = window.s = document.createElement('canvas');
    s.width = cols * tw; s.height = Math.ceil(${count} / cols) * (th + 26);
    window.sheet = { cols, tw, th, g: s.getContext('2d') };
    sheet.g.fillStyle = '#000'; sheet.g.fillRect(0, 0, s.width, s.height);
    return { w: v.videoWidth, h: v.videoHeight, duration: v.duration };
  })()`);
  console.log(`${path.basename(video)}: ${info.w}x${info.h}, ${info.duration.toFixed(1)} s`);

  for (let i = 0; i < count; i++) {
    const t = info.duration * (i + 0.5) / count;
    const png = await evaluate(`(async () => {
      await new Promise(r => { v.onseeked = r; v.currentTime = ${t}; });
      c.getContext('2d').drawImage(v, 0, 0);
      const { cols, tw, th, g } = sheet, x = ${i} % cols * tw, y = Math.floor(${i} / cols) * (th + 26);
      g.drawImage(v, x, y + 26, tw, th);
      g.fillStyle = '#fff'; g.font = 'bold 18px sans-serif'; g.fillText('${i + 1}   ${t.toFixed(1)}s', x + 6, y + 19);
      return c.toDataURL('image/png');
    })()`);
    save(`frame-${String(i + 1).padStart(2, '0')}.png`, png);
  }
  save('sheet.jpg', await evaluate(`s.toDataURL('image/jpeg', 0.85)`));
  console.log(`wrote ${count} frames + sheet.jpg to ${outDir}`);
} finally {
  ws.close();
  chrome.kill();
}
process.exit(0);

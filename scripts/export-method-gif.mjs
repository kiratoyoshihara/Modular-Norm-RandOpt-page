// Export the existing method illustration with its original CSS animation timing.
// Requires ffmpeg and Playwright (project-local or in .local/verification).
// Run: node scripts/export-method-gif.mjs [output.gif] [pixel-scale] [fps]
import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { METHOD_DURATIONS, renderMethodFigure } from '../assets/js/method-svg.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  ({ chromium } = createRequire(resolve(root, '.local/verification/package.json'))('playwright'));
}
const output = resolve(root, process.argv[2] || 'assets/animations/modular-norm-randopt.gif');
const pixelScale = Number(process.argv[3] || 1);
if (!Number.isInteger(pixelScale) || pixelScale < 1) throw new Error('Pixel scale must be a positive integer.');
const fps = Number(process.argv[4] || 20);
if (!Number.isInteger(fps) || fps < 1 || fps > 100) throw new Error('Frame rate must be an integer from 1 to 100.');
const frames = resolve(root, `.local/method-gif-frames-${pixelScale}x-${fps}fps`);
const width = 1440;
const hold = 1600;
const duration = METHOD_DURATIONS.reduce((sum, value) => sum + value, 0);
const frameCount = Math.ceil((duration + hold) * fps / 1000);
await mkdir(frames, { recursive: true });
await mkdir(dirname(output), { recursive: true });

const html = `<!doctype html>
<html lang="en" data-motion="running"><head><meta charset="utf-8">
<link rel="icon" href="data:,">
<link rel="stylesheet" href="/assets/css/style.css">
<link rel="stylesheet" href="/assets/css/research.css">
<link rel="stylesheet" href="/assets/css/method-animation.css">
<style>
  html { scroll-behavior: auto; }
  body { padding: 36px 40px; background: white; }
  .method-animation { margin: 0; padding: 0; border: 0; }
  .method-playback, .method-step-controls { display: none !important; }
</style></head><body>${renderMethodFigure()}
<script type="module">
  import { MethodAnimation } from '/assets/js/method-animation.js';
  import { METHOD_DURATIONS, METHOD_TIMING, METHOD_CANDIDATE_COUNT } from '/assets/js/method-svg.js';
  await document.fonts.ready;
  const figure = document.querySelector('.method-animation');
  const animation = new MethodAnimation(figure);
  animation.stopTimer();
  animation.observer?.disconnect();
  animation.userPaused = true;
  animation.visible = true;
  animation.sync();
  // A fixed shuffle makes repeated exports reproducible.
  figure.querySelectorAll('.method-source').forEach(source => {
    source.querySelectorAll('.method-noise-cell').forEach((cell, index) => {
      cell.style.setProperty('--cell-delay', ((index * 7 + 3) % 16) * 40 + 'ms');
    });
  });
  window.seekMethod = time => {
    let elapsed = time;
    let phase = 0;
    while (phase < METHOD_DURATIONS.length - 1 && elapsed >= METHOD_DURATIONS[phase]) {
      elapsed -= METHOD_DURATIONS[phase++];
    }
    const draw = phase < 2 ? 1 : phase === 2
      ? Math.min(METHOD_CANDIDATE_COUNT, Math.floor(elapsed / METHOD_TIMING.sampleInterval) + 1)
      : METHOD_CANDIDATE_COUNT;
    animation.phase = phase;
    animation.draw = draw;
    animation.complete = time >= METHOD_DURATIONS.reduce((sum, value) => sum + value, 0);
    animation.render(!animation.complete);
    animation.sync();
    // Drive the browser's own CSS keyframes, including easing and delays,
    // instead of depending on wall-clock screenshot speed.
    figure.getBoundingClientRect();
    figure.getAnimations({ subtree: true }).forEach(effect => {
      effect.pause();
      effect.currentTime = elapsed;
    });
    return { phase, draw, complete: animation.complete };
  };
  window.seekMethod(0);
  window.exportReady = true;
</script></body></html>`;

const mime = { '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (path === '/__method-gif__') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(html);
      return;
    }
    const file = resolve(root, '.' + decodeURIComponent(path));
    if (!file.startsWith(resolve(root, 'assets') + '/')) {
      response.writeHead(404).end();
      return;
    }
    const data = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
    response.end(data);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width, height: 800 }, deviceScaleFactor: pixelScale, reducedMotion: 'no-preference' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/__method-gif__`);
  await page.waitForFunction(() => window.exportReady);
  const height = await page.evaluate(() => Math.ceil(document.querySelector('.method-animation').getBoundingClientRect().bottom + 36));
  await page.setViewportSize({ width, height });
  console.log(`Rendering ${frameCount} frames at ${width * pixelScale} × ${height * pixelScale}, ${fps} fps.`);
  for (let frame = 0; frame < frameCount; frame++) {
    await page.evaluate(time => window.seekMethod(time), frame * 1000 / fps);
    await page.screenshot({ path: resolve(frames, `frame-${String(frame).padStart(4, '0')}.png`), animations: 'allow' });
    if (frame % 100 === 0) console.log(`Rendered ${frame + 1}/${frameCount}`);
  }
  const final = await page.evaluate(() => ({
    complete: document.querySelector('.method-animation').dataset.phase === '4',
    candidates: document.querySelectorAll('.method-diagram-desktop [data-candidate-state="complete"]').length,
    resultOpacity: getComputedStyle(document.querySelector('.method-diagram-desktop .method-vote-result')).opacity,
    overflow: document.documentElement.scrollWidth > window.innerWidth,
  }));
  if (errors.length || !final.complete || final.candidates !== 9 || final.resultOpacity !== '1' || final.overflow) {
    throw new Error(JSON.stringify({ errors, final }));
  }
  console.log('Verified all nine candidates and the final vote; encoding GIF.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}

// Generate the palette in a separate pass so high-resolution frames are not
// all buffered in memory while the palette is being calculated.
const palette = resolve(frames, 'palette.png');
const ffmpeg = args => {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ffmpeg exited with status ${result.status}`);
};
ffmpeg([
  '-framerate', String(fps), '-i', resolve(frames, 'frame-%04d.png'),
  '-t', String(frameCount / fps), '-vf', 'palettegen=stats_mode=diff',
  '-frames:v', '1', '-update', '1', palette,
]);
ffmpeg([
  '-framerate', String(fps), '-i', resolve(frames, 'frame-%04d.png'), '-i', palette,
  '-frames:v', String(frameCount), '-filter_complex', '[0:v][1:v]paletteuse=dither=sierra2_4a:diff_mode=rectangle',
  '-loop', '0', output,
]);
console.log(`Saved ${output} (${((await stat(output)).size / 1024 / 1024).toFixed(2)} MiB, ${(frameCount / fps).toFixed(2)} s).`);

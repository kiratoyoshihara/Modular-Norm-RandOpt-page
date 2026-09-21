// Render the share card from the method illustration's completed state.
// Requires Playwright, installed locally or in .local/verification.
// Run: node scripts/build-social-preview.mjs
import {createServer} from 'node:http';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname, extname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderMethodFigure} from '../assets/js/method-svg.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let chromium;
try { ({chromium} = createRequire(import.meta.url)('playwright')); }
catch { ({chromium} = createRequire(resolve(root, '.local/verification/package.json'))('playwright')); }

const preview = `<!doctype html><html lang="en" data-motion="running"><head><meta charset="utf-8">
<link rel="icon" href="data:,">
<link rel="stylesheet" href="/assets/css/style.css">
<link rel="stylesheet" href="/assets/css/research.css">
<link rel="stylesheet" href="/assets/css/method-animation.css">
</head><body>${renderMethodFigure()}<script type="module">
import {MethodAnimation} from '/assets/js/method-animation.js';
import {METHOD_CANDIDATE_COUNT, METHOD_STEPS} from '/assets/js/method-svg.js';
const animation = new MethodAnimation(document.querySelector('.method-animation'));
animation.stopTimer();
animation.observer?.disconnect();
animation.userPaused = true;
animation.phase = METHOD_STEPS.length - 1;
animation.draw = METHOD_CANDIDATE_COUNT;
animation.complete = true;
animation.render(false);
animation.sync();
await document.fonts.ready;
window.previewReady = true;
</script></body></html>`;

const mime = {'.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml', '.woff2':'font/woff2'};
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (path === '/preview') {
      response.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}).end(preview);
      return;
    }
    const file = resolve(root, '.' + decodeURIComponent(path));
    if (!file.startsWith(resolve(root, 'assets') + '/')) return response.writeHead(404).end();
    const data = await readFile(file);
    response.writeHead(200, {'Content-Type':mime[extname(file)] || 'application/octet-stream'}).end(data);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({headless:true});
  const page = await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const base = `http://127.0.0.1:${server.address().port}`;
  await page.goto(`${base}/preview`);
  await page.waitForFunction(() => window.previewReady);
  const diagram = await page.evaluate(() => {
    const source = document.querySelector('.method-diagram-desktop');
    if (source.querySelectorAll('[data-candidate-state="complete"]').length !== 9) throw new Error('Incomplete candidate population');
    if (source.querySelectorAll('[data-selected="true"]').length !== 3) throw new Error('Incomplete selection');
    const svg = source.cloneNode(true);
    svg.setAttribute('x', '62');
    svg.setAttribute('y', '224');
    svg.setAttribute('width', '1076');
    svg.setAttribute('height', String(1076 * 304 / 1020));
    svg.style.width = '1076px';
    svg.style.height = `${1076 * 304 / 1020}px`;
    return new XMLSerializer().serializeToString(svg);
  });
  const methodStyles = (await readFile(resolve(root, 'assets/css/method-animation.css'), 'utf8')).split('/* Reveal each stage')[0];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="card-title card-description">
<title id="card-title">Modular Norm RandOpt</title>
<desc id="card-description">Population-Efficient Ensembling through Architecture-Aware Perturbations. The completed method illustration: independent noise, normalization and scaling, nine candidates, top-three selection, and the final vote.</desc>
<style>
@font-face{font-family:Inter;src:url('../fonts/InterVariable.woff2') format('woff2');font-weight:100 900}
:root{--sans:Inter,Arial,Helvetica,sans-serif;--serif:"Iowan Old Style","Palatino Linotype",Georgia,serif;font-family:var(--sans)}
${methodStyles}
.method-candidate{transition:none}
</style>
<rect width="1200" height="630" fill="#fff"/>
<text x="70" y="108" font-size="64" font-weight="570" letter-spacing="-2.7" fill="#111">Modular Norm RandOpt</text>
<text x="73" y="165" font-size="30" font-weight="350" letter-spacing="-.4" fill="#49525C">Population-Efficient Ensembling</text>
<text x="73" y="205" font-size="30" font-weight="350" letter-spacing="-.4" fill="#49525C">through Architecture-Aware Perturbations</text>
${diagram}
<path d="M72 568H1128" stroke="#E6EBF0"/>
<text x="73" y="602" font-size="19" font-weight="450" fill="#49525C">Kirato Yoshihara · Hiroaki Hamade</text>
<text x="1128" y="602" text-anchor="end" font-size="17" fill="#87909B">The University of Osaka</text>
</svg>\n`;
  const output = resolve(root, 'assets/social');
  await mkdir(output, {recursive:true});
  await writeFile(resolve(output, 'og-image.svg'), svg);
  await page.goto(`${base}/assets/social/og-image.svg`);
  await page.evaluate(() => document.fonts.ready);
  if (errors.length) throw new Error(errors.join('\n'));
  await page.screenshot({path:resolve(output, 'og-image.png')});
  console.log('Rendered 1200×630 OGP card with the completed method diagram.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}

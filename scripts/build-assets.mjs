import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { renderRadar, renderLegend } from '../assets/js/radar-svg.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(await readFile(resolve(root, 'assets/data/transfer-results.json'), 'utf8'));
await writeFile(resolve(root, 'assets/figures/transfer-radar.svg'), renderRadar(data));
await writeFile(resolve(root, 'assets/figures/transfer-radar-mobile.svg'), renderRadar(data, '1.5B', { compact: true }));
const htmlPath = resolve(root, 'index.html');
let html = await readFile(htmlPath, 'utf8');
html = html.replace(/<!-- radar-legend:start -->[\s\S]*?<!-- radar-legend:end -->/, `<!-- radar-legend:start -->\n${renderLegend(data)}\n<!-- radar-legend:end -->`);
await writeFile(htmlPath, html);
console.log('Updated static radar images and the matching colored legend from transfer-results.json.');

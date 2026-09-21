import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { renderPipeline, renderCode, renderGeometryResponsive, renderAblation } from '../assets/js/research-visuals.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let html = await readFile(resolve(root, 'index.html'), 'utf8');
if (!html.includes('<!-- method-section:start -->')) {
  console.log('Method is currently omitted; its source templates are retained for restoration.');
  process.exit(0);
}
function replace(name, content) {
  const pattern = new RegExp(`<!-- ${name}:start -->[\\s\\S]*?<!-- ${name}:end -->`);
  if (!pattern.test(html)) throw new Error(`Missing illustration placeholder: ${name}`);
  html = html.replace(pattern, `<!-- ${name}:start -->\n${content}\n<!-- ${name}:end -->`);
}
replace('method-section', (await readFile(resolve(root, 'scripts/method-section.html'), 'utf8')).trimEnd());
const ablation = JSON.parse(await readFile(resolve(root, 'assets/data/method-ablation.json'), 'utf8'));
for (const [name, content] of [
  ['algorithm-flow', renderPipeline()], ['algorithm-code', renderCode()],
  ['geometry-drawing', renderGeometryResponsive()], ['ablation-mount', renderAblation(ablation)],
]) replace(name, content);
await writeFile(resolve(root, 'index.html'), html);
console.log('Updated the original illustrations, interactive research sections, and complete static fallbacks.');

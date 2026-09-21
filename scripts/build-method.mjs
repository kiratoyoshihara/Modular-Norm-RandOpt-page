import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMethodFigure } from '../assets/js/method-svg.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const path = resolve(root, 'index.html');
const html = await readFile(path, 'utf8');
const marker = /<!-- overview-method:start -->[\s\S]*?<!-- overview-method:end -->/;
if (!marker.test(html)) throw new Error('Missing Overview method markers');
await writeFile(path, html.replace(marker, `<!-- overview-method:start -->\n${renderMethodFigure()}\n<!-- overview-method:end -->`));
console.log('Rebuilt the Overview method illustration.');

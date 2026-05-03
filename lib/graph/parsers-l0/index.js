// L0 parser registry — ext → { parseL0, language }.

import * as javascript from './javascript.js';
import * as typescript from './typescript.js';
import * as python from './python.js';
import * as go from './go.js';
import * as java from './java.js';

const PARSERS = [javascript, typescript, python, go, java];

const extToParser = new Map();
for (const p of PARSERS) {
  for (const ext of p.extensions) extToParser.set(ext, p);
}

export function getParserForFile(path) {
  const dot = path.lastIndexOf('.');
  if (dot === -1) return null;
  const ext = path.slice(dot).toLowerCase();
  return extToParser.get(ext) ?? null;
}

export function supportedExtensions() {
  return Array.from(extToParser.keys());
}

export function listLanguages() {
  return Array.from(new Set(PARSERS.map((p) => p.parseL0('').language)));
}

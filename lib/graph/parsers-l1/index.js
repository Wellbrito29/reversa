// L1 parser registry — ext → { parseAst, language }.

import * as javascript from './javascript.js';
import * as typescript from './typescript.js';
import * as python from './python.js';

const PARSERS = [javascript, typescript, python];

const extToParser = new Map();
for (const p of PARSERS) {
  for (const ext of p.extensions) extToParser.set(ext, p);
}

export function getL1ParserForFile(path) {
  const dot = path.lastIndexOf('.');
  if (dot === -1) return null;
  const ext = path.slice(dot).toLowerCase();
  return extToParser.get(ext) ?? null;
}

export function l1SupportedExtensions() {
  return Array.from(extToParser.keys());
}

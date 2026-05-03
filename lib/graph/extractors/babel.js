// Shared extract() for Babel-based parsers (JS + TS).
// Returns the canonical { symbols, calls, exports } shape.

import { extractFunctions } from './functions.js';
import { extractClasses } from './classes.js';
import { extractCalls } from './calls.js';
import { extractExports } from './exports.js';

export function extractBabel(ast, file) {
  const symbols = [];
  const fns = extractFunctions(ast, file);
  const cls = extractClasses(ast, file);
  symbols.push(...fns);
  for (const c of cls) {
    symbols.push({
      id: c.id, type: c.type, file: c.file, name: c.name,
      line: c.line, exported: c.exported, extends: c.extends,
    });
    symbols.push(...c.methods);
  }
  return {
    symbols,
    calls: extractCalls(ast, file),
    exports: extractExports(ast, file),
  };
}

// L0 JavaScript parser — extracts import specifiers via regex.
//
// Catches:
//   import x from 'mod'
//   import { a, b } from 'mod'
//   import 'mod'
//   import('mod')        // dynamic
//   require('mod')
//   require.resolve('mod')
//
// Returns: { imports: string[], language: 'javascript' }
// Imports are raw specifiers; resolution happens in lib/graph/resolve.js.

const ES_IMPORT = /(?:^|\n|;)\s*import\s+(?:[\s\S]*?\bfrom\s+)?['"]([^'"]+)['"]/g;
const DYNAMIC_IMPORT = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const REQUIRE = /\brequire(?:\.resolve)?\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

export function parseL0(source) {
  const imports = new Set();
  const stripped = stripCommentsAndStrings(source);
  for (const re of [ES_IMPORT, DYNAMIC_IMPORT, REQUIRE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(stripped)) !== null) imports.add(m[1]);
  }
  return { imports: Array.from(imports), language: 'javascript' };
}

// Strip /* ... */ block comments + // line comments. Keeps string contents
// intact so regex-extracted import specifiers stay accurate. We do NOT
// strip strings — that would remove the very specifiers we want to find.
function stripCommentsAndStrings(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];
    if (c === '/' && c2 === '/') {
      const nl = src.indexOf('\n', i);
      if (nl === -1) break;
      i = nl;
      continue;
    }
    if (c === '/' && c2 === '*') {
      const end = src.indexOf('*/', i + 2);
      if (end === -1) break;
      i = end + 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

export const extensions = ['.js', '.jsx', '.mjs', '.cjs'];

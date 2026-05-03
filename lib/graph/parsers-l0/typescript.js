// L0 TypeScript parser — JS plus `import type` / `export type from` shapes.

const ES_IMPORT = /(?:^|\n|;)\s*import\s+(?:type\s+)?(?:[\s\S]*?\bfrom\s+)?['"]([^'"]+)['"]/g;
const ES_EXPORT_FROM = /(?:^|\n|;)\s*export\s+(?:type\s+)?(?:\*|\{[\s\S]*?\})\s+from\s+['"]([^'"]+)['"]/g;
const DYNAMIC_IMPORT = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const REQUIRE = /\brequire(?:\.resolve)?\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

export function parseL0(source) {
  const imports = new Set();
  const stripped = stripCommentsKeepStrings(source);
  for (const re of [ES_IMPORT, ES_EXPORT_FROM, DYNAMIC_IMPORT, REQUIRE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(stripped)) !== null) imports.add(m[1]);
  }
  return { imports: Array.from(imports), language: 'typescript' };
}

function stripCommentsKeepStrings(src) {
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

export const extensions = ['.ts', '.tsx', '.mts', '.cts'];

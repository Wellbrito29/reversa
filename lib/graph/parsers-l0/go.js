// L0 Go parser — single + grouped import blocks.

const SINGLE_IMPORT = /^\s*import\s+(?:[\w.]+\s+)?["`]([^"`]+)["`]/gm;
const GROUPED_IMPORT = /^\s*import\s*\(\s*([\s\S]*?)\)/gm;
const PACKAGE_DECL = /^\s*package\s+([a-zA-Z_]\w*)/m;
const QUOTED_PATH = /(?:[\w.]+\s+)?["`]([^"`]+)["`]/g;

export function parseL0(source) {
  const imports = new Set();
  const stripped = stripGoComments(source);

  SINGLE_IMPORT.lastIndex = 0;
  let m;
  while ((m = SINGLE_IMPORT.exec(stripped)) !== null) imports.add(m[1]);

  GROUPED_IMPORT.lastIndex = 0;
  while ((m = GROUPED_IMPORT.exec(stripped)) !== null) {
    QUOTED_PATH.lastIndex = 0;
    let inner;
    while ((inner = QUOTED_PATH.exec(m[1])) !== null) imports.add(inner[1]);
  }

  const pkgMatch = stripped.match(PACKAGE_DECL);
  return {
    imports: Array.from(imports),
    language: 'go',
    package: pkgMatch ? pkgMatch[1] : null,
  };
}

function stripGoComments(src) {
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

export const extensions = ['.go'];

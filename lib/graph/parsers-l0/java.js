// L0 Java parser — `import x.y.Z;` (incl. wildcard + static) + package decl.

const IMPORT = /^\s*import\s+(?:static\s+)?([\w.]+(?:\.\*)?)\s*;/gm;
const PACKAGE_DECL = /^\s*package\s+([\w.]+)\s*;/m;

export function parseL0(source) {
  const imports = new Set();
  const stripped = stripJavaComments(source);

  IMPORT.lastIndex = 0;
  let m;
  while ((m = IMPORT.exec(stripped)) !== null) imports.add(m[1]);

  const pkgMatch = stripped.match(PACKAGE_DECL);
  return {
    imports: Array.from(imports),
    language: 'java',
    package: pkgMatch ? pkgMatch[1] : null,
  };
}

function stripJavaComments(src) {
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

export const extensions = ['.java'];

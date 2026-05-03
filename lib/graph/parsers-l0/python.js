// L0 Python parser — `import X`, `from X import …`, `__import__('X')`.

const IMPORT = /^\s*import\s+([a-zA-Z_][\w.]*(?:\s*,\s*[a-zA-Z_][\w.]*)*)/gm;
const FROM_IMPORT = /^\s*from\s+(\.+[\w.]*|[a-zA-Z_][\w.]*)\s+import\s+/gm;
const DYNAMIC = /\b__import__\s*\(\s*['"]([^'"]+)['"]/g;

export function parseL0(source) {
  const imports = new Set();
  const stripped = stripPythonComments(source);

  IMPORT.lastIndex = 0;
  let m;
  while ((m = IMPORT.exec(stripped)) !== null) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0].trim();
      if (name) imports.add(name);
    }
  }

  FROM_IMPORT.lastIndex = 0;
  while ((m = FROM_IMPORT.exec(stripped)) !== null) imports.add(m[1].trim());

  DYNAMIC.lastIndex = 0;
  while ((m = DYNAMIC.exec(stripped)) !== null) imports.add(m[1]);

  return { imports: Array.from(imports), language: 'python' };
}

function stripPythonComments(src) {
  return src.split('\n').map((line) => {
    // Naive: strip from first # not inside a string. For L0 this is fine —
    // any false-negative on a `#` inside a string would only DROP an import
    // that isn't actually imported anyway.
    const idx = line.indexOf('#');
    return idx === -1 ? line : line.slice(0, idx);
  }).join('\n');
}

export const extensions = ['.py'];

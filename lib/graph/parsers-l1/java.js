// L1 Java parser — wraps tree-sitter-java.
//
// tree-sitter is a native module (.node binary). We load it lazily so the
// rest of the L1 layer keeps working when the optional dep is missing
// (Alpine without build-essential, edge runtimes, etc.). When unavailable,
// L0 still resolves Java imports — only signature-level features degrade.

import { createRequire } from 'node:module';
import { extractJava } from '../extractors/java.js';

const require_ = createRequire(import.meta.url);

let _parser = null;
let _loadError = null;

function loadParser() {
  if (_parser) return _parser;
  if (_loadError) throw _loadError;
  try {
    const Parser = require_('tree-sitter');
    const Java = require_('tree-sitter-java');
    const p = new Parser();
    p.setLanguage(Java);
    _parser = p;
    return p;
  } catch (e) {
    _loadError = new Error(
      `tree-sitter-java unavailable (${e.message}). ` +
      `Install with: npm install tree-sitter tree-sitter-java. ` +
      `Java files will fall back to L0 (imports only).`
    );
    throw _loadError;
  }
}

export function isAvailable() {
  if (_parser) return true;
  if (_loadError) return false;
  try { loadParser(); return true; } catch { return false; }
}

export function parseAst(source) {
  const parser = loadParser();
  return parser.parse(source);
}

export function extract(tree, file) {
  return extractJava(tree, file);
}

export const language = 'java';
export const extensions = ['.java'];

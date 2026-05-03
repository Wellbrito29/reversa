// L1 Python parser — wraps tree-sitter-python.
//
// tree-sitter is a native module (.node binary). We load it lazily so the
// rest of the L1 layer keeps working when the optional dep is missing
// (Alpine without build-essential, edge runtimes, etc.). When unavailable,
// L0 still resolves Python imports — only signature-level features degrade.

import { createRequire } from 'node:module';
import { extractPython } from '../extractors/python.js';

const require_ = createRequire(import.meta.url);

let _parser = null;
let _loadError = null;

function loadParser() {
  if (_parser) return _parser;
  if (_loadError) throw _loadError;
  try {
    const Parser = require_('tree-sitter');
    const Python = require_('tree-sitter-python');
    const p = new Parser();
    p.setLanguage(Python);
    _parser = p;
    return p;
  } catch (e) {
    _loadError = new Error(
      `tree-sitter-python unavailable (${e.message}). ` +
      `Install with: npm install tree-sitter tree-sitter-python. ` +
      `Python files will fall back to L0 (imports only).`
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
  return extractPython(tree, file);
}

export const language = 'python';
export const extensions = ['.py', '.pyi'];

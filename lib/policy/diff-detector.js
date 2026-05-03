// Signature-level diff detector.
//
// Inputs:
//   - file: project-relative path (drives parser selection)
//   - before, after: raw source strings for the file pre/post edit
//
// Output:
//   {
//     parsed: boolean,                // false when no L1 parser matched
//     reason?: string,                // why parsed === false
//     added:    [Symbol],             // present in `after` only
//     removed:  [Symbol],             // present in `before` only
//     changed:  [{ before, after, reasons: [string] }],   // signature/exported diffs
//     unchanged: number,              // count of symbols matched and identical
//   }
//
// Symbol identity uses the canonical id emitted by the L1 extractor (e.g.
// `src/auth/login.js#login` or `src/auth/login.go#Greeter.Greet`). When a
// symbol's id is stable across the edit but its `signature` differs we emit
// a `changed` entry — that is the signal Phase 10's smart policy gate uses
// to refuse breaking edits to protected contracts.

import { getL1ParserForFile } from '../graph/parsers-l1/index.js';

export function diffSignatures(file, before, after) {
  const parser = getL1ParserForFile(file);
  if (!parser) {
    return { parsed: false, reason: `no L1 parser for ${file}`, added: [], removed: [], changed: [], unchanged: 0 };
  }

  const beforeSyms = safeExtract(parser, before, file);
  const afterSyms = safeExtract(parser, after, file);
  if (beforeSyms.error || afterSyms.error) {
    return {
      parsed: false,
      reason: beforeSyms.error ?? afterSyms.error,
      added: [], removed: [], changed: [], unchanged: 0,
    };
  }

  const beforeIdx = indexById(beforeSyms.symbols);
  const afterIdx = indexById(afterSyms.symbols);

  const added = [];
  const removed = [];
  const changed = [];
  let unchanged = 0;

  for (const [id, after_] of afterIdx) {
    const before_ = beforeIdx.get(id);
    if (!before_) {
      added.push(after_);
      continue;
    }
    const reasons = diffSymbol(before_, after_);
    if (reasons.length === 0) {
      unchanged++;
    } else {
      changed.push({ before: before_, after: after_, reasons });
    }
  }
  for (const [id, before_] of beforeIdx) {
    if (!afterIdx.has(id)) removed.push(before_);
  }

  return { parsed: true, added, removed, changed, unchanged };
}

function safeExtract(parser, source, file) {
  if (typeof source !== 'string') return { symbols: [] };
  try {
    const ast = parser.parseAst(source, { filename: file });
    const out = parser.extract(ast, file);
    return { symbols: out.symbols ?? [] };
  } catch (e) {
    return { error: e.message, symbols: [] };
  }
}

function indexById(symbols) {
  const m = new Map();
  for (const s of symbols) {
    if (!s?.id) continue;
    m.set(s.id, s);
  }
  return m;
}

function diffSymbol(b, a) {
  const reasons = [];
  if (norm(b.signature) !== norm(a.signature)) {
    reasons.push('signature');
  }
  if (!!b.exported !== !!a.exported) {
    reasons.push(b.exported ? 'unexported' : 'exported');
  }
  if ((b.async ?? false) !== (a.async ?? false)) {
    reasons.push('async');
  }
  if (norm(b.extends) !== norm(a.extends)) {
    reasons.push('extends');
  }
  if (norm(b.kind) !== norm(a.kind)) {
    reasons.push('kind');
  }
  return reasons;
}

function norm(v) {
  if (v == null) return '';
  return String(v).replace(/\s+/g, ' ').trim();
}

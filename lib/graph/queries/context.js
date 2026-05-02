// Context lookup — for a symbol id or name, return:
//   - declaration  (symbol record)
//   - callers      (file + line for each call site whose callee resolves
//                   to the target — includes simple name match and
//                   member-call match `obj.method`)
//   - spec_link    (best-effort: exact spec mapping via code-spec-matrix
//                   if findable; null otherwise)
//
// We don't do scope resolution. A name match is conservative: it lists
// every site that calls something called `login`, regardless of which
// `login` the user meant. Good enough for "review impact of this rename".

import { findSymbol, findSymbolsByName } from './signature.js';

export function context(graph, target, opts = {}) {
  const symbols = graph.symbols ?? [];
  const calls = graph.calls ?? [];

  const decl = findSymbol(graph, target);
  if (!decl) return null;

  const matches = findSymbolsByName(graph, decl.name);
  const matchIds = new Set(matches.map((s) => s.id));

  const callers = calls.filter((c) => {
    const callName = c.callee;
    if (!callName) return false;
    const tail = callName.split('.').pop();
    return tail === decl.name;
  }).map((c) => ({
    file: c.file,
    line: c.line,
    callee: c.callee,
    arity: c.arity,
  }));

  const specLink = opts.matrix ? lookupSpec(opts.matrix, decl.file) : null;

  return {
    declaration: decl,
    aliases: matches.length > 1 ? matches.map((s) => s.id).filter((id) => id !== decl.id) : [],
    callers,
    callers_count: callers.length,
    spec_link: specLink,
  };

  // matchIds is not currently used — placeholder for future per-symbol disambiguation.
  // eslint-disable-next-line no-unreachable
  void matchIds;
}

function lookupSpec(matrix, file) {
  for (const [spec, files] of Object.entries(matrix)) {
    if (files.includes(file)) return spec;
  }
  return null;
}

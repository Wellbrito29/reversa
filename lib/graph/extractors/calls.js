// Call extractor — every CallExpression with a resolvable callee name.
//
// Uses @babel/traverse to walk the AST. Captures call expressions whose
// callee is an Identifier (`foo()`) or MemberExpression
// (`obj.method()`), recording the simple name + the line.
//
// We don't do scope resolution here — the cross-file linking is the
// graph's job (Phase 6+ queries will resolve `obj.method` against
// imports + `extractFunctions` results).

import _traverse from '@babel/traverse';

const traverse = _traverse.default ?? _traverse;

export function extractCalls(ast, file) {
  const out = [];
  traverse(ast, {
    CallExpression(path) {
      const name = calleeName(path.node.callee);
      if (!name) return;
      out.push({
        file,
        callee: name,
        line: path.node.loc?.start.line ?? null,
        arity: path.node.arguments.length,
        await: path.parent?.type === 'AwaitExpression',
      });
    },
  });
  return out;
}

function calleeName(callee) {
  if (!callee) return null;
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type === 'MemberExpression') {
    const obj = calleeName(callee.object);
    const prop = callee.property?.name ?? callee.property?.value;
    if (!prop) return obj;
    return obj ? `${obj}.${prop}` : prop;
  }
  if (callee.type === 'ThisExpression') return 'this';
  return null;
}

// Exports extractor — produces the module shape: which names are
// exported, default vs named, re-exports, plus CJS `module.exports = …`.

import _traverse from '@babel/traverse';

const traverse = _traverse.default ?? _traverse;

export function extractExports(ast, file) {
  const out = [];
  for (const node of ast.program.body) {
    if (node.type === 'ExportDefaultDeclaration') {
      out.push({
        file,
        kind: 'default',
        name: defaultName(node.declaration),
        line: node.loc?.start.line ?? null,
      });
    } else if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration) {
        for (const name of declarationNames(node.declaration)) {
          out.push({ file, kind: 'named', name, line: node.loc?.start.line ?? null });
        }
      }
      for (const spec of node.specifiers ?? []) {
        out.push({
          file,
          kind: spec.type === 'ExportNamespaceSpecifier' ? 'namespace' : 'named',
          name: spec.exported?.name ?? spec.exported?.value ?? '?',
          source: node.source?.value ?? null,
          line: node.loc?.start.line ?? null,
        });
      }
    } else if (node.type === 'ExportAllDeclaration') {
      out.push({
        file,
        kind: 'star',
        source: node.source?.value ?? null,
        line: node.loc?.start.line ?? null,
      });
    }
  }

  // CJS — module.exports = X / exports.foo = X
  traverse(ast, {
    AssignmentExpression(path) {
      const left = path.node.left;
      if (left?.type !== 'MemberExpression') return;
      const obj = left.object?.name;
      if (obj === 'module' && left.property?.name === 'exports') {
        out.push({ file, kind: 'cjs-default', name: null, line: path.node.loc?.start.line ?? null });
      } else if (obj === 'exports' && left.property?.name) {
        out.push({ file, kind: 'cjs-named', name: left.property.name, line: path.node.loc?.start.line ?? null });
      }
    },
  });
  return out;
}

function defaultName(decl) {
  if (!decl) return null;
  if (decl.type === 'FunctionDeclaration' || decl.type === 'ClassDeclaration') return decl.id?.name ?? '<anonymous>';
  if (decl.type === 'Identifier') return decl.name;
  return '<expr>';
}

function declarationNames(decl) {
  if (!decl) return [];
  if (decl.type === 'FunctionDeclaration' || decl.type === 'ClassDeclaration') {
    return [decl.id?.name].filter(Boolean);
  }
  if (decl.type === 'VariableDeclaration') {
    return decl.declarations.map((d) => d.id?.name).filter(Boolean);
  }
  return [];
}

// Function extractor — pulls top-level + exported function declarations
// + arrow / function expressions assigned to const/let/var.

import { buildFunctionSignature } from './signature-utils.js';

export function extractFunctions(ast, file) {
  const out = [];
  for (const node of ast.program.body) {
    visit(node, out, file, false);
  }
  return out;
}

function visit(node, out, file, isExport) {
  if (!node) return;
  if (node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration') {
    if (node.declaration) visit(node.declaration, out, file, true);
    return;
  }
  if (node.type === 'FunctionDeclaration') {
    out.push(makeRecord(file, node.id?.name ?? '<anonymous>', node, isExport));
    return;
  }
  if (node.type === 'VariableDeclaration') {
    for (const decl of node.declarations) {
      const init = decl.init;
      if (!init) continue;
      if (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') {
        out.push(makeRecord(file, decl.id?.name ?? '<anonymous>', init, isExport));
      }
    }
  }
}

function makeRecord(file, name, fnNode, exported) {
  const id = `${file}#${name}`;
  return {
    id,
    type: 'function',
    file,
    name,
    signature: buildFunctionSignature(fnNode),
    line: fnNode.loc?.start.line ?? null,
    exported,
    async: !!fnNode.async,
    generator: !!fnNode.generator,
  };
}

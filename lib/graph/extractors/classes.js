// Class extractor — top-level class declarations + methods.

import { buildFunctionSignature } from './signature-utils.js';

export function extractClasses(ast, file) {
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
  if (node.type === 'ClassDeclaration') {
    const name = node.id?.name ?? '<anonymous>';
    const id = `${file}#${name}`;
    out.push({
      id, type: 'class', file, name,
      line: node.loc?.start.line ?? null,
      exported: isExport,
      extends: node.superClass?.name ?? null,
      methods: extractMethods(node, file, name),
    });
  }
}

function extractMethods(classNode, file, className) {
  const methods = [];
  for (const member of classNode.body?.body ?? []) {
    if (member.type !== 'ClassMethod' && member.type !== 'ClassPrivateMethod') continue;
    const mname = member.key?.name ?? member.key?.value ?? '<anonymous>';
    methods.push({
      id: `${file}#${className}.${mname}`,
      type: 'method',
      file,
      name: mname,
      class: className,
      kind: member.kind ?? 'method',
      static: !!member.static,
      async: !!member.async,
      signature: buildFunctionSignature(member),
      line: member.loc?.start.line ?? null,
    });
  }
  return methods;
}

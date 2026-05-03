// Go L1 extractor — walks a tree-sitter-go tree and produces the canonical
// { symbols, calls, exports } shape used by builder-l1.
//
// Symbol IDs:
//   - Top-level functions:     "<file>#<Name>"
//   - Type declarations:       "<file>#<TypeName>"
//   - Methods (with receiver): "<file>#<TypeName>.<MethodName>"
//
// Go has no `export` keyword: identifiers starting with an uppercase letter
// are exported (visible to other packages). We mark `exported: true` for any
// top-level symbol whose first rune is uppercase ASCII (PascalCase).

export function extractGo(tree, file) {
  const root = tree.rootNode;
  const pkg = readPackageName(root);

  const symbols = [];
  const calls = [];
  const seenTypes = new Set();

  for (const child of root.namedChildren) {
    visitTopLevel(child, file, symbols, calls, seenTypes);
  }
  walkCalls(root, file, null, calls);

  return {
    symbols,
    calls,
    exports: buildExports(symbols, file),
    package: pkg,
  };
}

// ---------- top-level visit ----------

function visitTopLevel(node, file, symbols, calls, seenTypes) {
  switch (node.type) {
    case 'function_declaration': {
      const rec = makeFunctionRecord(node, file);
      if (rec) symbols.push(rec);
      return;
    }
    case 'method_declaration': {
      const rec = makeMethodRecord(node, file);
      if (rec) symbols.push(rec);
      return;
    }
    case 'type_declaration': {
      for (const spec of node.namedChildren) {
        if (spec.type === 'type_spec' || spec.type === 'type_alias') {
          const rec = makeTypeRecord(spec, file);
          if (rec && !seenTypes.has(rec.id)) {
            seenTypes.add(rec.id);
            symbols.push(rec);
          }
        }
      }
      return;
    }
    default:
      return;
  }
}

// ---------- functions ----------

function makeFunctionRecord(fnNode, file) {
  const name = textOf(fnNode.childForFieldName('name'));
  if (!name) return null;
  return {
    id: `${file}#${name}`,
    type: 'function',
    file,
    name,
    signature: buildSignature(fnNode),
    line: lineOf(fnNode),
    exported: isExportedName(name),
    async: false,
    generator: false,
  };
}

// ---------- methods (function with receiver) ----------

function makeMethodRecord(methodNode, file) {
  const name = textOf(methodNode.childForFieldName('name'));
  if (!name) return null;
  const recv = methodNode.childForFieldName('receiver');
  const recvType = receiverTypeName(recv);
  const owner = recvType ?? '<unknown>';
  return {
    id: `${file}#${owner}.${name}`,
    type: 'method',
    file,
    name,
    class: owner,
    kind: 'method',
    static: false,
    async: false,
    receiver: receiverText(recv),
    signature: buildSignature(methodNode),
    line: lineOf(methodNode),
    exported: isExportedName(name) && isExportedName(owner),
  };
}

function receiverTypeName(recvNode) {
  if (!recvNode) return null;
  // receiver is a parameter_list with a single parameter_declaration.
  const param = recvNode.namedChildren.find(
    (c) => c.type === 'parameter_declaration'
  );
  if (!param) return null;
  const t = param.childForFieldName('type') ?? lastTypeChild(param);
  return unwrapTypeName(t);
}

function receiverText(recvNode) {
  if (!recvNode) return null;
  const t = textOf(recvNode);
  return t ? t.trim() : null;
}

function unwrapTypeName(typeNode) {
  if (!typeNode) return null;
  if (typeNode.type === 'pointer_type') {
    const inner = typeNode.namedChildren[0];
    return unwrapTypeName(inner);
  }
  if (typeNode.type === 'generic_type') {
    const inner = typeNode.childForFieldName('type') ?? typeNode.namedChildren[0];
    return unwrapTypeName(inner);
  }
  if (typeNode.type === 'qualified_type') {
    return textOf(typeNode);
  }
  if (typeNode.type === 'type_identifier' || typeNode.type === 'identifier') {
    return textOf(typeNode);
  }
  return textOf(typeNode);
}

function lastTypeChild(paramDecl) {
  // parameter_declaration: <names> <type>; type is the last named child.
  const n = paramDecl.namedChildren;
  return n.length ? n[n.length - 1] : null;
}

// ---------- types (struct / interface / alias / etc.) ----------

function makeTypeRecord(specNode, file) {
  const name = textOf(specNode.childForFieldName('name'));
  if (!name) return null;
  const typeNode = specNode.childForFieldName('type');
  const kind = typeKindOf(typeNode);
  return {
    id: `${file}#${name}`,
    type: kind === 'interface' ? 'interface' : 'class',
    file,
    name,
    line: lineOf(specNode),
    exported: isExportedName(name),
    extends: extendsForType(typeNode),
    goKind: kind,
  };
}

function typeKindOf(typeNode) {
  if (!typeNode) return 'type';
  switch (typeNode.type) {
    case 'struct_type': return 'struct';
    case 'interface_type': return 'interface';
    case 'function_type': return 'function_type';
    case 'array_type': return 'array';
    case 'slice_type': return 'slice';
    case 'map_type': return 'map';
    case 'channel_type': return 'channel';
    case 'pointer_type': return 'pointer';
    case 'generic_type': return 'generic';
    case 'type_identifier':
    case 'qualified_type':
      return 'alias';
    default:
      return 'type';
  }
}

function extendsForType(typeNode) {
  if (!typeNode) return null;
  // Embedded fields in struct or interface act as inheritance.
  if (typeNode.type === 'struct_type') {
    const body = typeNode.namedChildren.find((c) => c.type === 'field_declaration_list');
    if (!body) return null;
    const embedded = [];
    for (const decl of body.namedChildren) {
      if (decl.type !== 'field_declaration') continue;
      const hasName = decl.childForFieldName('name') != null;
      if (hasName) continue;
      const t = decl.childForFieldName('type') ?? lastTypeChild(decl);
      const n = unwrapTypeName(t);
      if (n) embedded.push(n);
    }
    return embedded.length ? embedded.join(', ') : null;
  }
  if (typeNode.type === 'interface_type') {
    const embedded = [];
    for (const member of typeNode.namedChildren) {
      if (member.type === 'type_identifier' || member.type === 'qualified_type') {
        const n = unwrapTypeName(member);
        if (n) embedded.push(n);
      } else if (member.type === 'interface_type_name') {
        const n = textOf(member);
        if (n) embedded.push(n.trim());
      }
    }
    return embedded.length ? embedded.join(', ') : null;
  }
  return null;
}

// ---------- signature ----------

function buildSignature(fnNode) {
  const params = fnNode.childForFieldName('parameters');
  const result = fnNode.childForFieldName('result');
  const paramStr = params ? serializeParams(params) : '';
  const retStr = result ? ` ${serializeResult(result)}` : '';
  return `(${paramStr})${retStr}`;
}

function serializeParams(paramsNode) {
  const out = [];
  for (const decl of paramsNode.namedChildren) {
    if (decl.type === 'parameter_declaration') {
      out.push(serializeParamDecl(decl, false));
    } else if (decl.type === 'variadic_parameter_declaration') {
      out.push(serializeParamDecl(decl, true));
    }
  }
  return out.filter(Boolean).join(', ');
}

function serializeParamDecl(decl, variadic) {
  const typeNode = decl.childForFieldName('type') ?? lastTypeChild(decl);
  const typeStr = typeNode ? squish(textOf(typeNode)) : '';
  const names = [];
  for (const c of decl.namedChildren) {
    if (c === typeNode) continue;
    if (c.type === 'identifier' || c.type === 'field_identifier') {
      names.push(textOf(c));
    }
  }
  const prefix = variadic ? '...' : '';
  if (names.length === 0) return `${prefix}${typeStr}`;
  return `${names.join(', ')} ${prefix}${typeStr}`;
}

function serializeResult(resultNode) {
  if (resultNode.type === 'parameter_list') {
    const inner = serializeParams(resultNode);
    return `(${inner})`;
  }
  return squish(textOf(resultNode));
}

// ---------- calls ----------

function walkCalls(node, file, enclosingSymbol, calls) {
  if (!node) return;
  let nextEnclosing = enclosingSymbol;

  if (node.type === 'function_declaration') {
    const name = textOf(node.childForFieldName('name'));
    if (name) nextEnclosing = `${file}#${name}`;
  } else if (node.type === 'method_declaration') {
    const name = textOf(node.childForFieldName('name'));
    const recvType = receiverTypeName(node.childForFieldName('receiver'));
    if (name && recvType) nextEnclosing = `${file}#${recvType}.${name}`;
    else if (name) nextEnclosing = `${file}#${name}`;
  }

  if (node.type === 'call_expression') {
    const fnNode = node.childForFieldName('function');
    const callee = calleeName(fnNode);
    if (callee) {
      const args = node.childForFieldName('arguments');
      const arity = args ? args.namedChildren.length : 0;
      calls.push({
        from: nextEnclosing,
        file,
        callee,
        line: node.startPosition.row + 1,
        arity,
        await: false,
      });
    }
  }

  for (const c of node.namedChildren) walkCalls(c, file, nextEnclosing, calls);
}

function calleeName(node) {
  if (!node) return null;
  if (node.type === 'identifier' || node.type === 'field_identifier') {
    return node.text;
  }
  if (node.type === 'selector_expression') {
    const obj = calleeName(node.childForFieldName('operand'));
    const field = textOf(node.childForFieldName('field'));
    if (!field) return obj;
    return obj ? `${obj}.${field}` : field;
  }
  if (node.type === 'parenthesized_expression') {
    return calleeName(node.namedChildren[0]);
  }
  if (node.type === 'index_expression') {
    return calleeName(node.childForFieldName('operand'));
  }
  return null;
}

// ---------- exports / package ----------

function readPackageName(root) {
  for (const c of root.namedChildren) {
    if (c.type !== 'package_clause') continue;
    const id = c.namedChildren.find(
      (n) => n.type === 'package_identifier' || n.type === '_package_identifier'
    );
    if (id) return textOf(id);
  }
  return null;
}

function isExportedName(name) {
  if (!name) return false;
  const ch = name.charCodeAt(0);
  return ch >= 65 && ch <= 90; // A..Z
}

function buildExports(symbols, file) {
  const out = [];
  for (const s of symbols) {
    if (s.type === 'method') continue;
    if (!s.exported) continue;
    out.push({ file, kind: 'named', name: s.name, line: s.line });
  }
  return out;
}

// ---------- helpers ----------

function textOf(node) {
  return node ? node.text : null;
}

function lineOf(node) {
  return node?.startPosition?.row != null ? node.startPosition.row + 1 : null;
}

function squish(s) {
  return s == null ? '' : s.replace(/\s+/g, ' ').trim();
}

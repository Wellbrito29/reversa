// Python L1 extractor — walks a tree-sitter-python tree and produces
// the canonical { symbols, calls, exports } shape used by builder-l1.
//
// Symbol IDs follow the same pattern as JS/TS: "<file>#<name>" for
// top-level functions/classes; "<file>#<class>.<method>" for methods.
//
// Python has no `export` keyword. We mark a symbol exported when:
//   - its name does NOT start with `_` (PEP 8 convention), AND
//   - either no `__all__` is declared at module level, OR the name is
//     listed in `__all__`.

export function extractPython(tree, file) {
  const root = tree.rootNode;
  const allowed = collectDunderAll(root);

  const symbols = [];
  const calls = [];

  for (const child of root.namedChildren) {
    visitTopLevel(child, file, symbols, calls, allowed);
  }
  walkCalls(root, file, null, calls);

  return {
    symbols,
    calls,
    exports: buildExports(symbols, allowed, file),
  };
}

// ---------- top-level visit ----------

function visitTopLevel(node, file, symbols, calls, allowed) {
  if (node.type === 'decorated_definition') {
    const inner = node.childForFieldName('definition') ?? lastNamedChild(node);
    if (inner) visitTopLevel(inner, file, symbols, calls, allowed);
    return;
  }
  if (node.type === 'function_definition') {
    symbols.push(makeFunctionRecord(node, file, allowed));
    return;
  }
  if (node.type === 'class_definition') {
    const cls = makeClassRecord(node, file, allowed);
    symbols.push({
      id: cls.id, type: cls.type, file: cls.file, name: cls.name,
      line: cls.line, exported: cls.exported, extends: cls.extends,
    });
    symbols.push(...cls.methods);
  }
}

// ---------- functions ----------

function makeFunctionRecord(fnNode, file, allowed) {
  const name = textOf(fnNode.childForFieldName('name')) ?? '<anonymous>';
  const id = `${file}#${name}`;
  return {
    id,
    type: 'function',
    file,
    name,
    signature: buildSignature(fnNode),
    line: lineOf(fnNode),
    exported: isExported(name, allowed),
    async: isAsync(fnNode),
    generator: false,
  };
}

// ---------- classes ----------

function makeClassRecord(classNode, file, allowed) {
  const name = textOf(classNode.childForFieldName('name')) ?? '<anonymous>';
  const id = `${file}#${name}`;
  const supers = collectSuperclasses(classNode);
  return {
    id,
    type: 'class',
    file,
    name,
    line: lineOf(classNode),
    exported: isExported(name, allowed),
    extends: supers.length ? supers.join(', ') : null,
    methods: extractMethods(classNode, file, name),
  };
}

function collectSuperclasses(classNode) {
  const args = classNode.childForFieldName('superclasses');
  if (!args) return [];
  const out = [];
  for (const c of args.namedChildren) {
    if (c.type === 'identifier' || c.type === 'attribute') out.push(textOf(c));
  }
  return out.filter(Boolean);
}

function extractMethods(classNode, file, className) {
  const body = classNode.childForFieldName('body');
  if (!body) return [];
  const out = [];
  for (const member of body.namedChildren) {
    let target = member;
    let decorators = [];
    if (member.type === 'decorated_definition') {
      decorators = collectDecorators(member);
      target = member.childForFieldName('definition') ?? lastNamedChild(member);
    }
    if (!target || target.type !== 'function_definition') continue;
    const mname = textOf(target.childForFieldName('name')) ?? '<anonymous>';
    out.push({
      id: `${file}#${className}.${mname}`,
      type: 'method',
      file,
      name: mname,
      class: className,
      kind: methodKind(decorators, mname),
      static: decorators.includes('staticmethod'),
      async: isAsync(target),
      signature: buildSignature(target),
      line: lineOf(target),
    });
  }
  return out;
}

function methodKind(decorators, name) {
  if (decorators.includes('property')) return 'getter';
  if (decorators.includes('staticmethod')) return 'method';
  if (decorators.includes('classmethod')) return 'method';
  if (name === '__init__') return 'constructor';
  return 'method';
}

function collectDecorators(decoratedNode) {
  const out = [];
  for (const c of decoratedNode.namedChildren) {
    if (c.type !== 'decorator') continue;
    const inner = c.namedChildren[0];
    if (!inner) continue;
    if (inner.type === 'identifier' || inner.type === 'attribute') {
      out.push(textOf(inner));
    } else if (inner.type === 'call') {
      const fn = inner.childForFieldName('function');
      if (fn) out.push(textOf(fn));
    }
  }
  return out;
}

// ---------- signature ----------

function buildSignature(fnNode) {
  const params = fnNode.childForFieldName('parameters');
  const ret = fnNode.childForFieldName('return_type');
  const paramStr = params ? serializeParams(params) : '';
  const retStr = ret ? ` -> ${textOf(ret).trim()}` : '';
  return `(${paramStr})${retStr}`;
}

function serializeParams(paramsNode) {
  const out = [];
  for (const p of paramsNode.namedChildren) {
    out.push(serializeParam(p));
  }
  return out.filter(Boolean).join(', ');
}

function serializeParam(p) {
  switch (p.type) {
    case 'identifier':
      return textOf(p);
    case 'typed_parameter': {
      const name = textOf(p.namedChildren[0]);
      const type = textOf(p.childForFieldName('type'));
      return `${name}: ${type}`;
    }
    case 'default_parameter': {
      const name = textOf(p.childForFieldName('name'));
      return `${name} = …`;
    }
    case 'typed_default_parameter': {
      const name = textOf(p.childForFieldName('name'));
      const type = textOf(p.childForFieldName('type'));
      return `${name}: ${type} = …`;
    }
    case 'list_splat_pattern':
      return '*' + (textOf(p.namedChildren[0]) ?? '');
    case 'dictionary_splat_pattern':
      return '**' + (textOf(p.namedChildren[0]) ?? '');
    case 'positional_separator':
      return '/';
    case 'keyword_separator':
      return '*';
    default:
      return textOf(p) ?? '';
  }
}

// ---------- calls ----------

function walkCalls(node, file, enclosingSymbol, calls) {
  if (!node) return;
  let nextEnclosing = enclosingSymbol;
  if (node.type === 'function_definition') {
    const name = textOf(node.childForFieldName('name'));
    if (name) nextEnclosing = `${file}#${name}`;
  } else if (node.type === 'class_definition') {
    nextEnclosing = enclosingSymbol;
  }
  if (node.type === 'call') {
    const fnNode = node.childForFieldName('function');
    const name = calleeName(fnNode);
    if (name) {
      const args = node.childForFieldName('arguments');
      const arity = args ? args.namedChildren.length : 0;
      calls.push({
        from: nextEnclosing,
        file,
        callee: name,
        line: node.startPosition.row + 1,
        arity,
        await: node.parent?.type === 'await',
      });
    }
  }
  for (const c of node.namedChildren) walkCalls(c, file, nextEnclosing, calls);
}

function calleeName(node) {
  if (!node) return null;
  if (node.type === 'identifier') return node.text;
  if (node.type === 'attribute') {
    const obj = calleeName(node.childForFieldName('object'));
    const attr = textOf(node.childForFieldName('attribute'));
    if (!attr) return obj;
    return obj ? `${obj}.${attr}` : attr;
  }
  return null;
}

// ---------- exports / __all__ ----------

function collectDunderAll(root) {
  for (const child of root.namedChildren) {
    if (child.type !== 'expression_statement') continue;
    const assign = child.namedChildren[0];
    if (!assign || assign.type !== 'assignment') continue;
    const left = assign.childForFieldName('left');
    if (!left || textOf(left) !== '__all__') continue;
    const right = assign.childForFieldName('right');
    if (!right) continue;
    if (right.type === 'list' || right.type === 'tuple') {
      const names = [];
      for (const item of right.namedChildren) {
        if (item.type === 'string') {
          const s = item.text;
          names.push(s.slice(1, -1).replace(/^['"]|['"]$/g, ''));
        }
      }
      return new Set(names);
    }
  }
  return null;
}

function isExported(name, allowed) {
  if (allowed) return allowed.has(name);
  return !name.startsWith('_');
}

function buildExports(symbols, allowed, file) {
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

function isAsync(fnNode) {
  if (!fnNode) return false;
  for (let i = 0; i < fnNode.childCount; i++) {
    const c = fnNode.child(i);
    if (c?.type === 'async') return true;
    if (c?.type === 'def') break;
  }
  return false;
}

function lastNamedChild(node) {
  const n = node.namedChildren;
  return n.length ? n[n.length - 1] : null;
}

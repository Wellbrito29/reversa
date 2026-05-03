// Java L1 extractor — walks a tree-sitter-java tree and produces the canonical
// { symbols, calls, exports } shape used by builder-l1.
//
// Symbol IDs:
//   - Top-level types (class/interface/record/enum): "<file>#<TypeName>"
//   - Nested types:                                  "<file>#<Outer>.<Inner>"
//   - Methods / constructors:                        "<file>#<TypeName>.<method>"
//
// "Exported" maps to Java's `public` modifier. Top-level types and methods
// declared `public` get exported: true; everything else (package-private,
// protected, private) is exported: false.

export function extractJava(tree, file) {
  const root = tree.rootNode;
  const pkg = readPackageName(root);

  const symbols = [];
  const calls = [];

  for (const child of root.namedChildren) {
    visitTopLevel(child, file, null, symbols, calls);
  }
  walkCalls(root, file, null, calls, []);

  return {
    symbols,
    calls,
    exports: buildExports(symbols, file),
    package: pkg,
  };
}

// ---------- top-level + nested types ----------

const TYPE_NODES = new Set([
  'class_declaration',
  'interface_declaration',
  'record_declaration',
  'enum_declaration',
  'annotation_type_declaration',
]);

function visitTopLevel(node, file, parentName, symbols, calls) {
  if (!TYPE_NODES.has(node.type)) return;
  const name = textOf(node.childForFieldName('name'));
  if (!name) return;
  const qualified = parentName ? `${parentName}.${name}` : name;
  const id = `${file}#${qualified}`;

  symbols.push({
    id,
    type: kindForType(node.type),
    file,
    name,
    line: lineOf(node),
    exported: hasModifier(node, 'public'),
    extends: collectSuperTypes(node),
    javaKind: shortKind(node.type),
  });

  const body = node.childForFieldName('body');
  if (body) {
    for (const member of body.namedChildren) {
      if (member.type === 'method_declaration' || member.type === 'constructor_declaration') {
        const m = makeMethodRecord(member, file, qualified);
        if (m) symbols.push(m);
      } else if (TYPE_NODES.has(member.type)) {
        visitTopLevel(member, file, qualified, symbols, calls);
      }
    }
  }
}

function kindForType(nodeType) {
  if (nodeType === 'interface_declaration') return 'interface';
  if (nodeType === 'enum_declaration') return 'enum';
  return 'class';
}

function shortKind(nodeType) {
  return nodeType.replace(/_declaration$/, '');
}

// ---------- methods + constructors ----------

function makeMethodRecord(node, file, ownerQualified) {
  const isCtor = node.type === 'constructor_declaration';
  const name = isCtor
    ? textOf(node.childForFieldName('name')) ?? ownerQualified.split('.').pop()
    : textOf(node.childForFieldName('name'));
  if (!name) return null;
  return {
    id: `${file}#${ownerQualified}.${name}`,
    type: 'method',
    file,
    name,
    class: ownerQualified,
    kind: isCtor ? 'constructor' : 'method',
    static: hasModifier(node, 'static'),
    async: false,
    signature: buildSignature(node, isCtor),
    line: lineOf(node),
    exported: hasModifier(node, 'public') && exportedOwner(file, ownerQualified, /* hint */ true),
  };
}

function exportedOwner() {
  // Method "exported" defers to its own modifier; whether the type is public
  // is recorded on the type symbol. Keeping this hook lets future logic refine.
  return true;
}

function collectSuperTypes(node) {
  const out = [];
  for (let i = 0; i < node.namedChildCount; i++) {
    const c = node.namedChild(i);
    if (!c) continue;
    if (c.type === 'superclass') {
      out.push(squish(textOf(c).replace(/^extends\s+/, '')));
    } else if (c.type === 'super_interfaces' || c.type === 'extends_interfaces') {
      out.push(squish(textOf(c).replace(/^(implements|extends)\s+/, '')));
    }
  }
  return out.length ? out.join(', ') : null;
}

// ---------- modifiers ----------

function hasModifier(node, name) {
  for (let i = 0; i < node.namedChildCount; i++) {
    const c = node.namedChild(i);
    if (!c || c.type !== 'modifiers') continue;
    // Modifier keywords (`public`, `static`, …) appear as anonymous token
    // children of `modifiers`; annotations appear as named children. Walk
    // both so we don't miss the keywords.
    for (let j = 0; j < c.childCount; j++) {
      const m = c.child(j);
      if (!m) continue;
      if (m.type === name) return true;
    }
  }
  return false;
}

// ---------- signature ----------

function buildSignature(node, isCtor) {
  const params = node.childForFieldName('parameters');
  const type = isCtor ? null : node.childForFieldName('type');
  const paramStr = params ? serializeParams(params) : '';
  if (isCtor) return `(${paramStr})`;
  const ret = type ? `: ${squish(textOf(type))}` : '';
  return `(${paramStr})${ret}`;
}

function serializeParams(paramsNode) {
  const out = [];
  for (let i = 0; i < paramsNode.namedChildCount; i++) {
    const p = paramsNode.namedChild(i);
    if (!p) continue;
    if (p.type === 'formal_parameter') {
      const t = p.childForFieldName('type');
      const n = p.childForFieldName('name');
      const tn = t ? squish(textOf(t)) : '?';
      const nn = n ? textOf(n) : '_';
      out.push(`${nn}: ${tn}`);
    } else if (p.type === 'spread_parameter') {
      // Variadic: `Type... name`
      const t = p.namedChildren.find((c) => c.type !== 'variable_declarator' && c.type !== 'modifiers');
      const decl = p.namedChildren.find((c) => c.type === 'variable_declarator');
      const nn = decl ? textOf(decl.childForFieldName('name')) : '_';
      const tn = t ? squish(textOf(t)) : '?';
      out.push(`${nn}: ${tn}...`);
    } else if (p.type === 'receiver_parameter') {
      // Skip `this` receiver decls.
      continue;
    }
  }
  return out.join(', ');
}

// ---------- calls ----------

function walkCalls(node, file, enclosingSymbol, calls, typeStack) {
  if (!node) return;
  let nextEnclosing = enclosingSymbol;
  let pushedType = null;

  if (TYPE_NODES.has(node.type)) {
    const tname = textOf(node.childForFieldName('name'));
    if (tname) {
      const qualified = typeStack.length ? `${typeStack.join('.')}.${tname}` : tname;
      pushedType = qualified;
      typeStack.push(qualified);
    }
  } else if (node.type === 'method_declaration' || node.type === 'constructor_declaration') {
    const owner = typeStack.length ? typeStack[typeStack.length - 1] : null;
    const isCtor = node.type === 'constructor_declaration';
    const mname = isCtor
      ? textOf(node.childForFieldName('name')) ?? (owner ? owner.split('.').pop() : null)
      : textOf(node.childForFieldName('name'));
    if (owner && mname) nextEnclosing = `${file}#${owner}.${mname}`;
  }

  if (node.type === 'method_invocation') {
    const callee = invocationCallee(node);
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
  } else if (node.type === 'object_creation_expression') {
    // `new Foo(...)` → record as a call to Foo's constructor.
    const t = node.childForFieldName('type');
    const name = t ? squish(textOf(t)) : null;
    if (name) {
      const args = node.childForFieldName('arguments');
      const arity = args ? args.namedChildren.length : 0;
      calls.push({
        from: nextEnclosing,
        file,
        callee: `new ${name}`,
        line: node.startPosition.row + 1,
        arity,
        await: false,
      });
    }
  }

  for (const c of node.namedChildren) walkCalls(c, file, nextEnclosing, calls, typeStack);

  if (pushedType) typeStack.pop();
}

function invocationCallee(node) {
  const name = textOf(node.childForFieldName('name'));
  const obj = node.childForFieldName('object');
  if (obj) {
    const lhs = squish(textOf(obj));
    if (lhs && name) return `${lhs}.${name}`;
  }
  return name ?? null;
}

// ---------- package + exports ----------

function readPackageName(root) {
  for (const c of root.namedChildren) {
    if (c.type === 'package_declaration') {
      const id = c.namedChildren.find((n) =>
        n.type === 'scoped_identifier' || n.type === 'identifier'
      );
      if (id) return textOf(id);
    }
  }
  return null;
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

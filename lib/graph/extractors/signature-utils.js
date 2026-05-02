// Shared signature serialization for L1 extractors.
//
// Output is a stable, normalized string we can store + diff later.
// We don't need to be a TypeScript pretty-printer; we need
// "(a: string, b?: number) => Promise<User>" to round-trip the same
// way every time.

export function serializeParam(p) {
  if (!p) return '';
  if (p.type === 'Identifier') return paramWithType(p.name, p.typeAnnotation, p.optional);
  if (p.type === 'AssignmentPattern') {
    const name = p.left?.name ?? '?';
    return paramWithType(name, p.left?.typeAnnotation, false) + ' = …';
  }
  if (p.type === 'RestElement') return '...' + serializeParam(p.argument);
  if (p.type === 'ObjectPattern') return '{ … }' + serializeTypeAnnotation(p.typeAnnotation);
  if (p.type === 'ArrayPattern') return '[ … ]' + serializeTypeAnnotation(p.typeAnnotation);
  if (p.type === 'TSParameterProperty') return serializeParam(p.parameter);
  return p.name ?? '?';
}

function paramWithType(name, typeAnnotation, optional) {
  return name + (optional ? '?' : '') + serializeTypeAnnotation(typeAnnotation);
}

export function serializeTypeAnnotation(node) {
  if (!node) return '';
  const inner = node.typeAnnotation ?? node;
  return ': ' + serializeTSType(inner);
}

export function serializeReturnType(node) {
  if (!node) return '';
  const inner = node.typeAnnotation ?? node;
  return serializeTSType(inner);
}

export function serializeTSType(t) {
  if (!t) return 'unknown';
  switch (t.type) {
    case 'TSStringKeyword': return 'string';
    case 'TSNumberKeyword': return 'number';
    case 'TSBooleanKeyword': return 'boolean';
    case 'TSVoidKeyword': return 'void';
    case 'TSAnyKeyword': return 'any';
    case 'TSUnknownKeyword': return 'unknown';
    case 'TSNullKeyword': return 'null';
    case 'TSUndefinedKeyword': return 'undefined';
    case 'TSNeverKeyword': return 'never';
    case 'TSObjectKeyword': return 'object';
    case 'TSArrayType': return serializeTSType(t.elementType) + '[]';
    case 'TSUnionType': return t.types.map(serializeTSType).join(' | ');
    case 'TSIntersectionType': return t.types.map(serializeTSType).join(' & ');
    case 'TSTypeLiteral': return '{ … }';
    case 'TSTypeReference': {
      const name = t.typeName?.name ?? (t.typeName?.right?.name ?? 'unknown');
      const params = t.typeParameters?.params ?? [];
      if (params.length === 0) return name;
      return `${name}<${params.map(serializeTSType).join(', ')}>`;
    }
    case 'TSLiteralType': {
      const v = t.literal?.value;
      if (typeof v === 'string') return JSON.stringify(v);
      return String(v ?? '?');
    }
    case 'TSFunctionType':
    case 'TSConstructorType': {
      const params = (t.parameters ?? []).map(serializeParam).join(', ');
      const ret = serializeReturnType(t.typeAnnotation);
      return `(${params}) => ${ret}`;
    }
    default: return t.type ?? 'unknown';
  }
}

export function buildFunctionSignature(node) {
  const params = (node.params ?? []).map(serializeParam).join(', ');
  const ret = serializeReturnType(node.returnType);
  const arrow = ret ? ` => ${ret}` : '';
  return `(${params})${arrow}`;
}

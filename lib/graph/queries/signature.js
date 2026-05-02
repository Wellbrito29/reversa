// Signature lookup — symbol id or name → normalized signature string.

export function signature(graph, target) {
  const sym = findSymbol(graph, target);
  if (!sym) return null;
  return sym.signature ?? null;
}

export function findSymbol(graph, target) {
  const symbols = graph.symbols ?? [];
  const exact = symbols.find((s) => s.id === target);
  if (exact) return exact;
  return symbols.find((s) => s.name === target) ?? null;
}

export function findSymbolsByName(graph, name) {
  return (graph.symbols ?? []).filter((s) => s.name === name);
}

// Symbol diff — compares two L1 graphs (or two `symbols` arrays) and
// returns the structural changes:
//
//   { added: [sym], removed: [sym], signature_changed: [{before, after}] }
//
// Intended for Phase 10 (smart policy gate). Phase 6 ships the
// primitive; downstream phases consume it.

export function diffSymbols(before, after) {
  const beforeSyms = before?.symbols ?? before ?? [];
  const afterSyms = after?.symbols ?? after ?? [];

  const beforeMap = new Map(beforeSyms.map((s) => [s.id, s]));
  const afterMap = new Map(afterSyms.map((s) => [s.id, s]));

  const added = [];
  const removed = [];
  const signatureChanged = [];

  for (const [id, sym] of afterMap) {
    if (!beforeMap.has(id)) added.push(sym);
  }
  for (const [id, sym] of beforeMap) {
    if (!afterMap.has(id)) removed.push(sym);
  }
  for (const [id, prev] of beforeMap) {
    const next = afterMap.get(id);
    if (!next) continue;
    if (prev.signature !== next.signature) {
      signatureChanged.push({ id, before: prev, after: next });
    }
  }

  return { added, removed, signature_changed: signatureChanged };
}

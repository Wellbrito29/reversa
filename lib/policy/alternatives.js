// Suggest alternatives for a blocked signature change.
//
// Pure heuristics — no LLM. Reads the symbol diff and proposes safer paths
// the author can take instead of breaking the contract:
//
//   - "make the new param optional" when arity grew
//   - "introduce a new function" when an existing exported symbol changed shape
//   - "update the spec first" as the always-applicable fallback (forces the
//     ADR / spec-update flow before code lands)
//   - "make the export internal again" when a previously-exported symbol
//     is being broken — perhaps it shouldn't be public yet

export function suggestAlternatives(change) {
  const out = [];
  const reasons = change.reasons ?? [];
  const before = change.before ?? {};
  const after = change.after ?? {};

  if (reasons.includes('signature')) {
    const arityBefore = arityOf(before.signature);
    const arityAfter = arityOf(after.signature);

    if (arityAfter > arityBefore) {
      out.push({
        kind: 'optional-param',
        title: 'Make the new parameter optional',
        body:
          'Default-value or nullable parameters preserve the existing call ' +
          'sites. For required additions, callers must be migrated first.',
      });
    } else if (arityAfter < arityBefore) {
      out.push({
        kind: 'overload',
        title: 'Introduce an overload / new function instead of removing args',
        body:
          'Removing parameters silently breaks existing callers. Add a new ' +
          'function with the smaller arity and keep the original.',
      });
    } else {
      out.push({
        kind: 'shape-shift',
        title: 'Introduce a new function rather than reshaping this one',
        body:
          'The arity is unchanged but the parameter or return shape moved. ' +
          'A new exported function lets callers migrate at their own pace.',
      });
    }
  }

  if (reasons.includes('exported')) {
    out.push({
      kind: 'internal-export',
      title: 'Keep the symbol internal until the contract is ratified',
      body:
        'Exposing a new export is a contract change. Update the spec (and ' +
        'add an ADR if needed) before exporting.',
    });
  }

  if (reasons.includes('unexported')) {
    out.push({
      kind: 'deprecation',
      title: 'Deprecate the export instead of removing it',
      body:
        'Mark the symbol deprecated, keep it exported for one release, and ' +
        'remove only after callers migrate.',
    });
  }

  out.push({
    kind: 'spec-first',
    title: 'Update the spec first',
    body:
      'Edit the relevant `_aegis_sdd/sdd/*.md` (or open an ADR), then re-' +
      'run the edit. The override flow exists exactly for cases where the ' +
      'contract genuinely needs to change.',
  });

  return out;
}

function arityOf(signature) {
  if (!signature) return 0;
  const m = signature.match(/\(([^)]*)\)/);
  if (!m) return 0;
  const inside = m[1].trim();
  if (!inside) return 0;
  return inside.split(',').map((s) => s.trim()).filter(Boolean).length;
}

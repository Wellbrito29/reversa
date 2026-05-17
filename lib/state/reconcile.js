// Reconciles `aegis/config/state.json.checkpoints[*].outputs` against the
// filesystem. Detects stale entries (paths the orchestrator recorded as
// generated but that no longer exist in the project).
//
// Used by:
//   - `aegis state reconcile` (read-only report; default)
//   - `aegis state reconcile --prune` (drops stale outputs from state.json)
//   - Skills via `reconcileState()` import (orchestrator startup hint)

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { STATE_JSON } from '../paths.js';
import { readJsonSafe } from '../utils/json-safe.js';

/**
 * Inspects state.json checkpoints against the filesystem.
 *
 * @param {string} projectRoot - absolute path to project root
 * @returns {{
 *   ok: boolean,
 *   state_path: string,
 *   checkpoints: Array<{ name: string, ok: boolean, stale: string[], present: string[] }>,
 *   total_stale: number,
 *   missing_state: boolean
 * }}
 */
export function reconcileState(projectRoot) {
  const root = resolve(projectRoot);
  const statePath = join(root, STATE_JSON);
  if (!existsSync(statePath)) {
    return {
      ok: false,
      state_path: statePath,
      checkpoints: [],
      total_stale: 0,
      missing_state: true,
    };
  }
  const state = readJsonSafe(statePath);
  const checkpoints = state.checkpoints ?? {};
  const report = [];
  let totalStale = 0;
  for (const [name, cp] of Object.entries(checkpoints)) {
    const outputs = Array.isArray(cp.outputs) ? cp.outputs : [];
    const present = [];
    const stale = [];
    for (const rel of outputs) {
      const abs = join(root, rel);
      if (existsSync(abs)) present.push(rel);
      else stale.push(rel);
    }
    if (stale.length > 0) totalStale += stale.length;
    report.push({ name, ok: stale.length === 0, stale, present });
  }
  return {
    ok: totalStale === 0,
    state_path: statePath,
    checkpoints: report,
    total_stale: totalStale,
    missing_state: false,
  };
}

/**
 * Removes stale paths from each checkpoint.outputs. Writes state.json back.
 * Returns the report after pruning (which should have total_stale=0).
 *
 * Pruning policy:
 *   - If a checkpoint ends up with zero outputs, keep its metadata but with
 *     empty outputs array — don't drop the checkpoint entirely; the
 *     timestamp/counts may still be useful audit trail.
 *
 * @param {string} projectRoot
 * @returns {{ pruned: number, report: ReturnType<typeof reconcileState> }}
 */
export function pruneStaleCheckpoints(projectRoot) {
  const root = resolve(projectRoot);
  const statePath = join(root, STATE_JSON);
  if (!existsSync(statePath)) {
    return { pruned: 0, report: reconcileState(root) };
  }
  const state = readJsonSafe(statePath);
  const checkpoints = state.checkpoints ?? {};
  let pruned = 0;
  for (const [, cp] of Object.entries(checkpoints)) {
    if (!Array.isArray(cp.outputs)) continue;
    const survivors = cp.outputs.filter((rel) => existsSync(join(root, rel)));
    if (survivors.length !== cp.outputs.length) {
      pruned += cp.outputs.length - survivors.length;
      cp.outputs = survivors;
    }
  }
  state.checkpoints = checkpoints;
  writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
  return { pruned, report: reconcileState(root) };
}

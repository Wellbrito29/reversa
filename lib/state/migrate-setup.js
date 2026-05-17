// Migrates `aegis/config/setup.json` from legacy kebab-case keys to the
// canonical snake_case schema. Idempotent: running on an already-migrated
// file is a noop.
//
// Maps every kebab-cased key under any object to its snake_case equivalent
// (replace `-` with `_`). Non-string keys are left alone.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SETUP_JSON } from '../paths.js';
import { readJsonSafe } from '../utils/json-safe.js';

function kebabToSnake(key) {
  return typeof key === 'string' ? key.replace(/-/g, '_') : key;
}

function migrateObject(value) {
  if (Array.isArray(value)) return value.map(migrateObject);
  if (value === null || typeof value !== 'object') return value;
  const out = {};
  let changed = false;
  for (const [k, v] of Object.entries(value)) {
    const newKey = kebabToSnake(k);
    if (newKey !== k) changed = true;
    out[newKey] = migrateObject(v);
  }
  return changed ? out : value;
}

/**
 * @param {string} projectRoot
 * @returns {{ migrated: boolean, path: string }}
 */
export function migrateSetupJson(projectRoot) {
  const root = resolve(projectRoot);
  const path = join(root, SETUP_JSON);
  if (!existsSync(path)) return { migrated: false, path };
  const before = readJsonSafe(path);
  const after = migrateObject(before);
  if (after === before) return { migrated: false, path };
  writeFileSync(path, JSON.stringify(after, null, 2) + '\n', 'utf8');
  return { migrated: true, path };
}

// For deleted source files: finds spec markdown files that still reference
// the deleted path and rewrites each one via the spec-writer LLM to remove
// the stale reference. Only specs under aegis/specs/ are scanned.
//
// This is separate from updating code-spec-matrix.md (handled by the keeper
// SKILL.md). That step marks the matrix row as ~~deletado~~; this step
// cleans the prose inside the specs themselves (K-06).

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { rewriteSpec } from './spec-writer.js';

function walkSpecs(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      results.push(...walkSpecs(full));
    } else if (name.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Find spec files that contain a text reference to `deletedFile`.
 *
 * @param {string} root          Project root
 * @param {string} deletedFile   Relative path of the deleted source file
 * @returns {string[]}           Relative spec paths that reference the file
 */
export function findSpecsReferencingFile(root, deletedFile) {
  const specsDir = join(root, 'aegis', 'specs');
  const all = walkSpecs(specsDir);
  const refs = [];
  // Match both the raw path and common markdown link/code-span forms.
  const needle = deletedFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(needle);
  for (const abs of all) {
    try {
      if (re.test(readFileSync(abs, 'utf8'))) {
        refs.push(relative(root, abs));
      }
    } catch { /* skip unreadable */ }
  }
  return refs;
}

/**
 * Rewrite each spec that references `deletedFile` to remove the stale
 * mention. Returns a summary of what was (or would be) updated.
 *
 * @param {string}  root
 * @param {string}  deletedFile
 * @param {{ dryRun?: boolean, model?: string, apiKey?: string }} opts
 * @returns {Promise<Array<{spec: string, updated: boolean, error?: string}>>}
 */
export async function cleanDeletedRefs(root, deletedFile, opts = {}) {
  const specs = findSpecsReferencingFile(root, deletedFile);
  const results = [];

  for (const specPath of specs) {
    const abs = join(root, specPath);
    const specContent = readFileSync(abs, 'utf8');

    if (opts.dryRun) {
      results.push({ spec: specPath, updated: false, dry_run: true });
      continue;
    }

    try {
      const updated = await rewriteSpec({
        apiKey: opts.apiKey,
        model: opts.model,
        specPath,
        specContent,
        diff: '',
        graphContext: null,
        deletedFile,
      });
      writeFileSync(abs, updated.content, 'utf8');
      results.push({ spec: specPath, updated: true });
    } catch (e) {
      results.push({ spec: specPath, updated: false, error: e.message });
    }
  }

  return results;
}

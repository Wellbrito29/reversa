// Registry of hook generators per engine.
//
// Each generator module exports a default object with this shape:
//
//   {
//     id: string,                         // engine id matching detector.js
//     name: string,                       // human-readable name
//     describe(): string,                 // one-line description of what gets installed
//     generate({ projectRoot, runnerPath }): {
//       files: Array<{
//         path: string,                   // absolute path
//         content: string,                // full file content (for new files)
//         mergeInto?: 'json'|'toml'|'js', // if file may exist, how to merge
//         section?: object,               // for json/toml: the fragment to inject
//         marker?: { start: string, end: string }, // for line-based merges
//       }>,
//       summary: string,                  // human-readable preview text
//     },
//     remove({ projectRoot }): {
//       removed: string[],                // absolute paths fully deleted
//       cleaned: string[],                // absolute paths edited (hook entries stripped)
//     },
//   }

import claude from './claude.js';

export const HOOK_GENERATORS = [claude];

export function findGenerator(engineId) {
  return HOOK_GENERATORS.find((g) => g.id === engineId) ?? null;
}

export function listSupportedEngines() {
  return HOOK_GENERATORS.map((g) => ({ id: g.id, name: g.name, describe: g.describe() }));
}

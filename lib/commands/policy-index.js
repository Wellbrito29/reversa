// `npx reversa policy-index <subcommand>`
//
// Subcommands:
//   build          Build .reversa/context/policy-index.json from spec frontmatter
//   show           Print the current index (JSON)
//
// Exit codes:
//   0 ok / 1 missing index when `show`d / 1 bad usage

import { resolve } from 'node:path';
import chalk from 'chalk';
import { buildPolicyIndex, writePolicyIndex, readPolicyIndex } from '../policy/index-builder.js';

const orange = chalk.hex('#ffa203');

function usage() {
  console.log(`
  Usage: npx reversa policy-index <subcommand>

  Subcommands:
    build          Build .reversa/context/policy-index.json from spec frontmatter
    show           Print the current index (JSON)
`);
}

export default async function policyIndexCmd(rawArgs) {
  if (rawArgs.length === 0 || rawArgs[0] === '--help' || rawArgs[0] === '-h') {
    usage();
    return;
  }
  const projectRoot = resolve(process.cwd());
  const sub = rawArgs[0];

  if (sub === 'build') {
    const t0 = Date.now();
    const index = buildPolicyIndex(projectRoot);
    const path = writePolicyIndex(projectRoot, index);
    const ms = Date.now() - t0;
    const protectedCount = Object.keys(index.protected_files).length;
    const globsCount = index.protected_globs.length;
    const specsCount = Object.keys(index.specs).length;
    console.log(orange(`\n  ✓  policy-index written: ${path}`));
    console.log(`     ${specsCount} specs, ${protectedCount} protected files, ${globsCount} protected globs (${ms}ms)\n`);
    return;
  }

  if (sub === 'show') {
    const index = readPolicyIndex(projectRoot);
    if (!index) {
      console.error(orange('\n  No policy index. Run: npx reversa policy-index build\n'));
      process.exit(1);
    }
    console.log(JSON.stringify(index, null, 2));
    return;
  }

  console.error(orange(`\n  Unknown subcommand: ${sub}\n`));
  usage();
  process.exit(1);
}

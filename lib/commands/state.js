// `aegis state <subcommand>`
//
// Subcommands:
//   reconcile [--prune] [--json]   Audit state.json checkpoints vs filesystem

import chalk from 'chalk';
import { reconcileState, pruneStaleCheckpoints } from '../state/reconcile.js';

const orange = chalk.hex('#ffa203');

function parseArgs(args) {
  const out = { positional: [], flags: {} };
  for (const a of args) {
    if (a === '--prune') out.flags.prune = true;
    else if (a === '--json') out.flags.json = true;
    else out.positional.push(a);
  }
  return out;
}

function printReport(report, { pruned } = {}) {
  if (report.missing_state) {
    console.log(chalk.red('  state.json not found at ' + report.state_path));
    return;
  }
  if (pruned !== undefined) {
    console.log(chalk.green(`  Pruned ${pruned} stale output entries`));
  }
  if (report.ok) {
    console.log(chalk.green('  ✓ state.json fully in sync with filesystem'));
    return;
  }
  console.log(orange(`  Stale outputs detected: ${report.total_stale}\n`));
  for (const cp of report.checkpoints) {
    if (cp.ok) continue;
    console.log(`  ${chalk.bold(cp.name)} — ${cp.stale.length} missing`);
    for (const rel of cp.stale) console.log(chalk.red('    ✗ ' + rel));
  }
  console.log('');
  console.log(chalk.gray('  Run with --prune to drop stale entries from state.json'));
}

export default async function stateCmd(args) {
  const [sub, ...rest] = args;
  if (sub !== 'reconcile') {
    console.error('Usage: aegis state reconcile [--prune] [--json]');
    process.exit(1);
  }
  const opts = parseArgs(rest);
  const root = process.cwd();
  if (opts.flags.prune) {
    const result = pruneStaleCheckpoints(root);
    if (opts.flags.json) {
      process.stdout.write(JSON.stringify({ ok: true, ...result }, null, 2) + '\n');
      return;
    }
    printReport(result.report, { pruned: result.pruned });
    return;
  }
  const report = reconcileState(root);
  if (opts.flags.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    if (!report.ok) process.exit(2);
    return;
  }
  printReport(report);
  if (!report.ok) process.exit(2);
}

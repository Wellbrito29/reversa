import { existsSync, mkdirSync, renameSync, cpSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { readJsonSafe } from '../utils/json-safe.js';

const MAPPING = [
  // Config
  { from: '.aegis/state.json', to: 'aegis/config/state.json' },
  { from: '.aegis/config.toml', to: 'aegis/config/config.toml' },
  { from: '.aegis/config.user.toml', to: 'aegis/config/config.user.toml' },
  { from: '.aegis/_config/manifest.yaml', to: 'aegis/config/manifest.yaml' },
  { from: '.aegis/_config/files-manifest.json', to: 'aegis/config/files-manifest.json' },
  { from: '.aegis/setup.json', to: 'aegis/config/setup.json' },
  { from: '.aegis/version', to: 'aegis/config/version' },
  { from: '.aegis/plan.md', to: 'aegis/plan.md' },
  // Runtime
  { from: '.aegis/context', to: 'aegis/runtime/context', dir: true },
  { from: '.aegis/audit', to: 'aegis/runtime/audit', dir: true },
  { from: '.aegis/keeper-queue.jsonl', to: 'aegis/runtime/queue/keeper-queue.jsonl' },
  { from: '.aegis/templates', to: 'aegis/runtime/templates', dir: true },
  { from: '.aegis/scripts', to: 'aegis/runtime/scripts', dir: true },
  { from: '.aegis/hooks.yml', to: 'aegis/runtime/hooks.yml' },
  // Specs
  { from: '_aegis_sdd/sdd', to: 'aegis/specs/sdd', dir: true },
  { from: '_aegis_sdd/user-stories', to: 'aegis/specs/user-stories', dir: true },
  { from: '_aegis_sdd/adrs', to: 'aegis/specs/adrs', dir: true },
  { from: '_aegis_sdd/openapi', to: 'aegis/specs/openapi', dir: true },
  // Reports
  { from: '_aegis_sdd/drift.md', to: 'aegis/reports/drift.md' },
  { from: '_aegis_sdd/confidence-report.md', to: 'aegis/reports/confidence-report.md' },
  { from: '_aegis_sdd/gaps.md', to: 'aegis/reports/gaps.md' },
  { from: '_aegis_sdd/questions.md', to: 'aegis/reports/questions.md' },
  { from: '_aegis_sdd/code-analysis.md', to: 'aegis/reports/code-analysis.md' },
  { from: '_aegis_sdd/changelog', to: 'aegis/reports/changelog', dir: true },
  // Traceability
  { from: '_aegis_sdd/traceability', to: 'aegis/traceability', dir: true },
  // Architecture
  { from: '_aegis_sdd/architecture.md', to: 'aegis/architecture/architecture.md' },
  { from: '_aegis_sdd/c4-context.md', to: 'aegis/architecture/c4-context.md' },
  { from: '_aegis_sdd/c4-containers.md', to: 'aegis/architecture/c4-containers.md' },
  { from: '_aegis_sdd/c4-components.md', to: 'aegis/architecture/c4-components.md' },
  { from: '_aegis_sdd/erd-complete.md', to: 'aegis/architecture/erd-complete.md' },
  // Migration
  { from: '_aegis_sdd/migration', to: 'aegis/migration', dir: true },
  // Skills
  { from: '.agents/skills', to: 'aegis/skills', dir: true },
  { from: '.claude/skills', to: 'aegis/skills', dir: true, merge: true },
];

export default async function migrateLayout(args) {
  const { default: chalk } = await import('chalk');
  const { default: ora } = await import('ora');

  const projectRoot = resolve(process.cwd());
  const dryRun = args.includes('--dry-run');

  console.log(chalk.bold('\n  Aegis Spec: Migrate Layout\n'));
  console.log(chalk.gray('  Migrating from legacy layout (.aegis/ + _aegis_sdd/) to single-folder aegis/\n'));

  const spinner = ora({ text: 'Analyzing...', color: 'cyan' }).start();

  const planned = [];
  const skipped = [];

  for (const mapping of MAPPING) {
    const src = join(projectRoot, mapping.from);
    const dest = join(projectRoot, mapping.to);

    if (!existsSync(src)) {
      skipped.push({ from: mapping.from, reason: 'not found' });
      continue;
    }

    if (existsSync(dest) && !mapping.merge) {
      skipped.push({ from: mapping.from, reason: 'destination exists' });
      continue;
    }

    planned.push({ ...mapping, src, dest });
  }

  spinner.stop();

  if (planned.length === 0) {
    console.log(chalk.yellow('  Nothing to migrate. Legacy layout not detected or already migrated.\n'));
    return;
  }

  console.log(chalk.bold(`  Planned migrations (${planned.length}):`));
  for (const p of planned) {
    console.log(`  ${chalk.cyan(p.from)} → ${chalk.cyan(p.to)}`);
  }

  if (skipped.length > 0) {
    console.log(chalk.bold(`\n  Skipped (${skipped.length}):`));
    for (const s of skipped) {
      console.log(chalk.gray(`  ${s.from} (${s.reason})`));
    }
  }

  if (dryRun) {
    console.log(chalk.gray('\n  Dry run — no changes made.\n'));
    return;
  }

  console.log('');
  const { default: inquirer } = await import('inquirer');
  const { confirmed } = await inquirer.prompt([{
    type: 'input',
    name: 'confirmed',
    message: `Type ${chalk.red('"migrate"')} to confirm:`,
    validate: (v) => v === 'migrate' || 'Type exactly "migrate" to confirm.',
  }]);

  if (confirmed !== 'migrate') {
    console.log(chalk.gray('\n  Migration cancelled.\n'));
    return;
  }

  spinner.start('Migrating...');
  let moved = 0;
  let errors = 0;

  for (const p of planned) {
    try {
      mkdirSync(dirname(p.dest), { recursive: true });

      if (p.dir) {
        if (p.merge && existsSync(p.dest)) {
          // Merge: copy individual files, skip duplicates
          const entries = readdirSync(p.src, { withFileTypes: true });
          for (const entry of entries) {
            const srcFile = join(p.src, entry.name);
            const destFile = join(p.dest, entry.name);
            if (existsSync(destFile)) continue;
            if (entry.isDirectory()) {
              cpSync(srcFile, destFile, { recursive: true });
            } else {
              mkdirSync(dirname(destFile), { recursive: true });
              renameSync(srcFile, destFile);
            }
          }
        } else {
          renameSync(p.src, p.dest);
        }
      } else {
        renameSync(p.src, p.dest);
      }
      moved++;
    } catch (err) {
      console.error(chalk.red(`    Error moving ${p.from}: ${err.message}`));
      errors++;
    }
  }

  // Update state.json output_folder if it points to _aegis_sdd
  const statePath = join(projectRoot, 'aegis', 'config', 'state.json');
  if (existsSync(statePath)) {
    try {
      const state = readJsonSafe(statePath);
      if (state.output_folder === '_aegis_sdd' || state.output_folder === '.aegis') {
        state.output_folder = 'aegis';
        writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
      }
    } catch { /* ignore */ }
  }

  spinner.stop();

  if (errors === 0) {
    console.log(chalk.hex('#ffa203')(`\n  Migration complete! ${moved} item(s) moved.\n`));
  } else {
    console.log(chalk.yellow(`\n  Completed with ${errors} error(s). ${moved} item(s) moved.\n`));
  }

  console.log(chalk.gray('  Next steps:'));
  console.log(chalk.gray('  1. Review the migrated files in aegis/'));
  console.log(chalk.gray('  2. Update your .gitignore to remove old entries'));
  console.log(chalk.gray('  3. Commit the changes'));
  console.log(chalk.gray('  4. You can now remove the old folders (.aegis/, _aegis_sdd/, .agents/skills/)\n'));
}

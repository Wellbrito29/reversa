import { existsSync, cpSync, readFileSync, writeFileSync, renameSync } from 'fs';
import { join, resolve } from 'path';
import { readJsonSafe } from '../utils/json-safe.js';

export default async function migrateReversa(args) {
  const { default: chalk } = await import('chalk');
  const { default: ora } = await import('ora');

  const projectRoot = resolve(process.cwd());
  const oldDir = join(projectRoot, '.reversa');
  const newDir = join(projectRoot, '.aegis');
  const oldSdd = join(projectRoot, '_reversa_sdd');
  const newSdd = join(projectRoot, '_aegis_sdd');

  console.log(chalk.bold('\n  Aegis Spec: Migrate from Reversa\n'));

  if (!existsSync(oldDir) && !existsSync(oldSdd)) {
    console.log(chalk.yellow('  No Reversa installation found (.reversa/ or _reversa_sdd/).\n'));
    return;
  }

  const spinner = ora({ text: 'Migrating...', color: 'cyan' }).start();

  try {
    // Migrate runtime dir
    if (existsSync(oldDir)) {
      if (existsSync(newDir)) {
        spinner.stop();
        console.log(chalk.yellow('  .aegis/ already exists. Skipping runtime dir migration.\n'));
        spinner.start('Migrating...');
      } else {
        cpSync(oldDir, newDir, { recursive: true });
        // Update state.json agent IDs
        const statePath = join(newDir, 'state.json');
        if (existsSync(statePath)) {
          const state = readJsonSafe(statePath);
          if (state.agents) {
            state.agents = state.agents.map((a) => a.replace(/^reversa-/, 'aegis-'));
          }
          if (state.engines) {
            // engines are engine IDs, not affected
          }
          if (state.version) {
            state.version = '2.0.0';
          }
          writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
        }
      }
    }

    // Migrate specs output dir
    if (existsSync(oldSdd)) {
      if (existsSync(newSdd)) {
        spinner.stop();
        console.log(chalk.yellow('  _aegis_sdd/ already exists. Skipping specs dir migration.\n'));
        spinner.start('Migrating...');
      } else {
        renameSync(oldSdd, newSdd);
      }
    }

    spinner.succeed(chalk.hex('#ffa203')('Migration complete!'));
    console.log('');
    console.log(chalk.bold('  Summary:'));
    if (existsSync(oldDir)) {
      console.log(`  ${chalk.cyan('Runtime:')}   .reversa/ → .aegis/`);
    }
    if (existsSync(oldSdd)) {
      console.log(`  ${chalk.cyan('Specs:')}     _reversa_sdd/ → _aegis_sdd/`);
    }
    console.log(`  ${chalk.cyan('Agent IDs:')} updated reversa-* → aegis-*`);
    console.log('');
    console.log(chalk.gray('  Tip: After verifying everything works, you can remove .reversa/ and _reversa_sdd/ manually.\n'));
  } catch (err) {
    spinner.fail(chalk.red('Migration failed.'));
    throw err;
  }
}

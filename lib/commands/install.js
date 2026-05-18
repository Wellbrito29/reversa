import { join, resolve } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { detectEngines, ENGINES } from '../installer/detector.js';
import { checkExistingInstallation } from '../installer/validator.js';
import { runInstallPrompts, MIGRATION_AGENT_IDS, TRANSLATOR_AGENT_IDS, FORWARD_AGENT_IDS } from '../installer/prompts.js';
import { Writer } from '../installer/writer.js';
import { buildManifest, saveManifest, loadManifest } from '../installer/manifest.js';
import { readJsonSafe } from '../utils/json-safe.js';
import { migrateSetupJson } from '../state/migrate-setup.js';
import { installGitHook } from '../installer/git-hooks.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');

function getVersion() {
  try {
    const pkg = readJsonSafe(join(REPO_ROOT, 'package.json'));
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function parseArgs(args) {
  const out = { nonInteractive: false, cwd: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--non-interactive') out.nonInteractive = true;
    else if (a === '--cwd') out.cwd = args[++i];
    else if (a.startsWith('--cwd=')) out.cwd = a.slice('--cwd='.length);
  }
  return out;
}

export default async function install(args) {
  const { default: chalk } = await import('chalk');
  const { default: ora } = await import('ora');

  const opts = parseArgs(args);
  const projectRoot = resolve(opts.cwd ?? process.cwd());
  const version = getVersion();

  console.log(chalk.hex('#00e676')(`
   █████╗ ███████╗ ██████╗ ██╗███████╗
  ██╔══██╗██╔════╝██╔════╝ ██║██╔════╝
  ███████║█████╗  ██║  ███╗██║███████╗
  ██╔══██║██╔══╝  ██║   ██║██║╚════██║
  ██║  ██║███████╗╚██████╔╝██║███████║
  ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝╚══════╝
`));
  console.log(chalk.gray('  Executable specifications and guardrails for AI-assisted code\n'));
  console.log(chalk.bold('  Installation\n'));

  // Safety checks
  if (projectRoot === '/' || projectRoot === process.env.HOME) {
    console.log(chalk.red('  Error: Cannot install Aegis in system root or home directory.\n'));
    console.log(chalk.gray('  Run this command inside a project directory.\n'));
    process.exit(1);
  }

  const aegisDir = join(projectRoot, 'aegis');
  if (existsSync(aegisDir)) {
    const stateFile = join(aegisDir, 'config', 'state.json');
    const configFile = join(aegisDir, 'config', 'config.toml');
    if (!existsSync(stateFile) || !existsSync(configFile)) {
      console.log(chalk.yellow('  Warning: aegis/ exists but appears incomplete.\n'));
      const { default: inquirer } = await import('inquirer');
      const { cleanInstall } = await inquirer.prompt([{
        type: 'confirm',
        name: 'cleanInstall',
        message: 'Remove existing aegis/ and start fresh?',
        default: false,
      }]);
      if (!cleanInstall) {
        console.log(chalk.gray('\n  Installation cancelled.\n'));
        return;
      }
      // Remove incomplete installation
      const { rmSync } = await import('fs');
      rmSync(aegisDir, { recursive: true, force: true });
    }
  }

  // Check existing installation
  const existing = checkExistingInstallation(projectRoot);
  if (existing.installed) {
    console.log(chalk.yellow(`  Aegis Spec is already installed (v${existing.version}) in this project.\n`));
    const { default: inquirer } = await import('inquirer');
    const { proceed } = await inquirer.prompt([{
      type: 'confirm',
      name: 'proceed',
      message: 'Do you want to reinstall / update the configuration?',
      default: false,
    }]);
    if (!proceed) {
      console.log(chalk.gray('\n  Installation cancelled.\n'));
      return;
    }
  }

  // Detect engines
  const detectedEngines = detectEngines(projectRoot);
  const detected = detectedEngines.filter(e => e.detected).map(e => e.name).join(', ');
  if (detected) {
    console.log(chalk.gray(`  Detected: ${detected}\n`));
  }

  // Collect answers
  let answers;
  if (opts.nonInteractive) {
    // Non-interactive mode: use defaults
    answers = {
      project_name: 'aegis-project',
      author: 'Developer',
      doc_level: 'completo',
      output_folder: 'aegis',
      git_strategy: 'track',
      answer_mode: 'chat',
      organization: 'por módulo',
      engines: ['claude-code'],
      agents: [
        'aegis',
        'aegis-scout',
        'aegis-archaeologist',
        'aegis-detective',
        'aegis-architect',
        'aegis-writer',
        'aegis-reviewer',
        'aegis-keeper',
      ],
      language: 'pt-br',
      language_label: 'Português',
      install_git_hook: false,
    };
    console.log(chalk.gray('  Non-interactive mode: using defaults\n'));
  } else {
    try {
      answers = await runInstallPrompts(detectedEngines);
    } catch (err) {
      if (err.isTtyError || err.message?.includes('cancel')) {
        console.log(chalk.gray('\n  Installation cancelled.\n'));
        return;
      }
      throw err;
    }
  }

  const selectedEngines = ENGINES.filter(e => answers.engines.includes(e.id));
  const writer = new Writer(projectRoot);

  const spinner = ora({ text: 'Installing agents...', color: 'cyan' }).start();

  try {
    // Install skills for each agent x engine
    for (const agent of answers.agents) {
      for (const engine of selectedEngines) {
        await writer.installSkill(agent, engine.skillsDir);
        if (engine.universalSkillsDir && engine.universalSkillsDir !== engine.skillsDir) {
          await writer.installSkill(agent, engine.universalSkillsDir);
        }
      }
    }

    // Stop spinner before possible interactive conflict prompts
    spinner.stop();

    // Instalar entry file de cada engine (deduplica arquivos compartilhados)
    const seenEntryFiles = new Set();
    for (const engine of selectedEngines) {
      if (!engine.entryFile) continue;
      if (seenEntryFiles.has(engine.entryFile)) continue;
      seenEntryFiles.add(engine.entryFile);
      await writer.installEntryFile(engine);
    }

    spinner.start('Creating aegis/ structure...');

    // Criar estrutura aegis/
    writer.createAegisSpecDir(answers, version);

    // Se reinstall: atualizar engines/agents/config no state.json existente
    if (existing.installed) {
      const statePath = join(projectRoot, 'aegis', 'config', 'state.json');
      if (existsSync(statePath)) {
        const s = readJsonSafe(statePath);
        s.engines = answers.engines;
        s.agents = answers.agents;
        s.answer_mode = answers.answer_mode;
        s.output_folder = answers.output_folder;
        writeFileSync(statePath, JSON.stringify(s, null, 2), 'utf8');
      }
    }

    // .gitignore
    if (answers.git_strategy === 'gitignore') {
      writer.updateGitignore(answers.output_folder);
    }

    writer.saveCreatedFiles();

    // Migrate legacy kebab-case keys in setup.json (idempotent)
    migrateSetupJson(projectRoot);

    // Git pre-commit hook (opt-in via prompt)
    if (answers.install_git_hook) {
      try {
        installGitHook(projectRoot);
      } catch (err) {
        spinner.warn(chalk.yellow(`Skipped git hook: ${err.message}`));
        spinner.start();
      }
    }

    spinner.text = 'Generating manifest...';

    // Manifest com caminhos relativos, apenas arquivos (não diretórios)
    const existingManifest = existing.installed ? loadManifest(projectRoot) : {};
    const newManifest = buildManifest(projectRoot, writer.manifestPaths);
    saveManifest(projectRoot, { ...existingManifest, ...newManifest });

    spinner.succeed(chalk.hex('#ffa203')('Installation complete!'));
  } catch (err) {
    spinner.fail(chalk.red('Error during installation.'));
    throw err;
  }

  // Resumo
  const engineNames = selectedEngines.map(e => e.name).join(', ');
  const migrationInstalled = answers.agents.filter(a => MIGRATION_AGENT_IDS.includes(a));
  const translatorsInstalled = answers.agents.filter(a => TRANSLATOR_AGENT_IDS.includes(a));
  const forwardInstalled = answers.agents.filter(a => FORWARD_AGENT_IDS.includes(a));
  const discoveryInstalled = answers.agents.filter(a =>
    !MIGRATION_AGENT_IDS.includes(a) &&
    !TRANSLATOR_AGENT_IDS.includes(a) &&
    !FORWARD_AGENT_IDS.includes(a)
  );

  console.log('');
  console.log(chalk.bold('  Summary:'));
  console.log(`  ${chalk.cyan('Project:')}   ${answers.project_name}`);
  console.log(`  ${chalk.cyan('Engines:')}   ${engineNames}`);
  console.log(`  ${chalk.cyan('Version:')}   ${version}`);
  console.log('');
  console.log(chalk.bold('  Agents installed:'));
  console.log(`  ${chalk.cyan('Discovery Team:')}      ${discoveryInstalled.length} agent(s)`);
  if (migrationInstalled.length > 0) {
    console.log(`  ${chalk.cyan('Migration Team:')}      ${migrationInstalled.length} agent(s)`);
  } else {
    console.log(`  ${chalk.gray('Migration Team:       not installed (run')} ${chalk.cyan('npx aegis-spec add-agent')}${chalk.gray(' to add later)')}`);
  }
  if (forwardInstalled.length > 0) {
    console.log(`  ${chalk.cyan('Forward Cycle:')}       ${forwardInstalled.length} agent(s)`);
  }
  if (translatorsInstalled.length > 0) {
    console.log(`  ${chalk.cyan('Translators:')}         ${translatorsInstalled.length} agent(s)`);
  }
  console.log('');

  if (selectedEngines.length > 0) {
    const names = selectedEngines.map(e => e.name);
    const namesStr = names.length > 1
      ? names.slice(0, -1).join(', ') + ' or ' + names.slice(-1)[0]
      : names[0];
    const hasSlashEngine = selectedEngines.some(e => e.id !== 'codex');
    const startCommand = hasSlashEngine ? '/aegis' : 'aegis';
    console.log(chalk.cyan(`  → Open ${namesStr} and type: ${startCommand} in the chat to start the discovery`));
    if (migrationInstalled.length > 0) {
      const migrateCommand = hasSlashEngine ? '/aegis-migrate' : 'aegis-migrate';
      console.log(chalk.cyan(`  → After discovery completes, run ${migrateCommand} to plan the rebuild`));
    }
    if (translatorsInstalled.includes('aegis-n8n')) {
      const n8nCommand = hasSlashEngine ? '/aegis-n8n' : 'aegis-n8n';
      console.log(chalk.cyan(`  → To analyze N8N workflows, drop the JSONs in n8n_json_workflows/ and run ${n8nCommand}`));
    }
    console.log(chalk.cyan(`  → Run ${chalk.bold('aegis graph build')} once to enable Keeper severity scoring and drift blast-radius`));
  }
  console.log('');
}

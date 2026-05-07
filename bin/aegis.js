#!/usr/bin/env node

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

const [,, command, ...args] = process.argv;

const commands = {
  install:            () => import('../lib/commands/install.js'),
  update:             () => import('../lib/commands/update.js'),
  status:             () => import('../lib/commands/status.js'),
  uninstall:          () => import('../lib/commands/uninstall.js'),
  'add-agent':        () => import('../lib/commands/add-agent.js'),
  'add-engine':       () => import('../lib/commands/add-engine.js'),
  'add-hooks':        () => import('../lib/commands/add-hooks.js'),
  'remove-hooks':     () => import('../lib/commands/remove-hooks.js'),
  'drift-check':      () => import('../lib/commands/drift-check.js'),
  'export-diagrams':  () => import('../lib/commands/export-diagrams.js'),
  graph:              () => import('../lib/commands/graph.js'),
  'policy-index':     () => import('../lib/commands/policy-index.js'),
  'policy-check':     () => import('../lib/commands/policy-check.js'),
  'keeper':           () => import('../lib/commands/keeper-auto.js'),
  'migrate-reversa':  () => import('../lib/commands/migrate-reversa.js'),
  'migrate-layout':   () => import('../lib/commands/migrate-layout.js'),
};

const green = chalk.hex('#00e676');

if (!command || command === '--help' || command === '-h') {
  console.log(green(
    '\n' +
    '   █████╗ ███████╗ ██████╗ ██╗███████╗\n' +
    '  ██╔══██╗██╔════╝██╔════╝ ██║██╔════╝\n' +
    '  ███████║█████╗  ██║  ███╗██║███████╗\n' +
    '  ██╔══██║██╔══╝  ██║   ██║██║╚════██║\n' +
    '  ██║  ██║███████╗╚██████╔╝██║███████║\n' +
    '  ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝╚══════╝\n'
  ) + '\n' +
  '  AEGIS  v' + pkg.version + '\n' +
  '\n' +
  '  Uso: npx aegis-spec <comando>   ou   aegis <comando>\n' +
  '\n' +
  '  Comandos:\n' +
  '    install            Instala o Aegis Spec no projeto atual\n' +
  '    update             Atualiza os agentes para a última versão\n' +
  '    status             Mostra o estado atual da análise\n' +
  '    uninstall          Remove o Aegis Spec do projeto\n' +
  '    add-agent          Adiciona um agente ao projeto\n' +
  '    add-engine         Adiciona suporte a uma engine\n' +
  '    add-hooks          Instala hooks pre/post-edit do Keeper na engine\n' +
  '                       Opções: --engine=<id>  --yes\n' +
  '    remove-hooks       Remove hooks do Keeper instalados em uma engine\n' +
  '                       Opções: --engine=<id>  --all  --yes\n' +
  '    drift-check        CI gate — exit 1 se houver specs com drift pendente\n' +
  '                       Opções: --format=text|json  --severity=high|medium|low\n' +
  '    export-diagrams    Exporta diagramas Mermaid como imagens SVG/PNG\n' +
  '                       Opções: --format=svg|png  --output=<pasta>\n' +
  '                       Requer: npm install -g @mermaid-js/mermaid-cli\n' +
  '    graph              Constrói/consulta o knowledge graph L0 do código\n' +
  '                       Subcomandos: build | impact | deps | reverse-deps | stats\n' +
  '                       Opções: --json  --since=<ref>  --files=a,b,c\n' +
  '    policy-index       Constrói índice de specs protegidas pra policy gate\n' +
  '                       Subcomandos: build | show\n' +
  '    policy-check       CI gate — analisa git diff e bloqueia signature breaks\n' +
  '                       Opções: --base=<ref>  --head=<ref>\n' +
  '                               --format=text|json  --severity=high|medium|low\n' +
  '    keeper auto        Auto-resolve drift via LLM (whitelist + classifier)\n' +
  '                       Opções: --dry-run  --max-specs=N  --format=text|json\n' +
  '    migrate-reversa    Migra instalação Reversa → Aegis Spec (.reversa → aegis)\n' +
  '    migrate-layout     Migra layout antigo → pasta única aegis/ (v2.0+)\n' +
  '\n' +
  '  Documentação: https://github.com/Wellbrito29/Aegis\n' +
  '  ');
  process.exit(0);
}

if (command === '--version' || command === '-v') {
  console.log(pkg.version);
  process.exit(0);
}

if (!commands[command]) {
  console.error(`\n  Comando desconhecido: "${command}"`);
  console.error('  Execute "npx aegis-spec --help" para ver os comandos disponíveis.\n');
  process.exit(1);
}

const mod = await commands[command]();
await mod.default(args);

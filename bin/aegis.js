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
};

const orange = chalk.hex('#ffa203');

if (!command || command === '--help' || command === '-h') {
  console.log(orange(`
    _                            _     
   / \\   ___ ___  ___ _ __ ___  (_)___ 
  / _ \\ / __/ __|/ _ \\ '__/ _ \\ | / __|
 / ___ \\__ \\__ \\  __/ | | (_) || \\__ \\
/_/   \\_\\___/___/\\___|_|  \\___(_)/ |___/
                               |__/    
`) + `
  aegis-spec v${pkg.version}

  Uso: npx aegis-spec <comando>   ou   aegis <comando>

  Comandos:
    install            Instala o Aegis Spec no projeto atual
    update             Atualiza os agentes para a última versão
    status             Mostra o estado atual da análise
    uninstall          Remove o Aegis Spec do projeto
    add-agent          Adiciona um agente ao projeto
    add-engine         Adiciona suporte a uma engine
    add-hooks          Instala hooks pre/post-edit do Keeper na engine
                       Opções: --engine=<id>  --yes
    remove-hooks       Remove hooks do Keeper instalados em uma engine
                       Opções: --engine=<id>  --all  --yes
    drift-check        CI gate — exit 1 se houver specs com drift pendente
                       Opções: --format=text|json  --severity=high|medium|low
    export-diagrams    Exporta diagramas Mermaid como imagens SVG/PNG
                       Opções: --format=svg|png  --output=<pasta>
                       Requer: npm install -g @mermaid-js/mermaid-cli
    graph              Constrói/consulta o knowledge graph L0 do código
                       Subcomandos: build | impact | deps | reverse-deps | stats
                       Opções: --json  --since=<ref>  --files=a,b,c
    policy-index       Constrói índice de specs protegidas pra policy gate
                       Subcomandos: build | show
    policy-check       CI gate — analisa git diff e bloqueia signature breaks
                       Opções: --base=<ref>  --head=<ref>
                               --format=text|json  --severity=high|medium|low
    keeper auto        Auto-resolve drift via LLM (whitelist + classifier)
                       Opções: --dry-run  --max-specs=N  --format=text|json
    migrate-reversa    Migra instalação Reversa → Aegis Spec (.reversa → .aegis)

  Documentação: https://github.com/sandeco/reversa
  `);
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

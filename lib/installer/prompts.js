import inquirer from 'inquirer';
import { applyOrangeTheme, ORANGE_PREFIX } from './orange-prompts.js';

applyOrangeTheme();

const REQUIRED_AGENTS = [
  { name: 'Aegis Spec: main orchestrator', value: 'aegis', disabled: true },
  { name: 'Scout: reconnaissance', value: 'aegis-scout', disabled: true },
  { name: 'Archaeologist: excavation', value: 'aegis-archaeologist', disabled: true },
  { name: 'Detective: interpretation', value: 'aegis-detective', disabled: true },
  { name: 'Architect: architectural synthesis', value: 'aegis-architect', disabled: true },
  { name: 'Writer: spec generation', value: 'aegis-writer', disabled: true },
];

const OPTIONAL_AGENTS = [
  { name: 'Reviewer: spec review and validation', value: 'aegis-reviewer', checked: true },
  { name: 'Visor: UI analysis via screenshots', value: 'aegis-visor', checked: true },
  { name: 'Data Master: database analysis', value: 'aegis-data-master', checked: true },
  { name: 'Design System: design tokens and themes', value: 'aegis-design-system', checked: true },
  { name: 'Agents Help: explains agents with analogies', value: 'aegis-agents-help', checked: true },
  { name: 'Reconstructor: rebuilds the software from generated specs', value: 'aegis-reconstructor', checked: true },
  { name: 'Keeper: keeps specs in sync with code changes', value: 'aegis-keeper', checked: true },
];

const MIGRATION_TEAM = [
  { name: 'Migrate: orchestrator of the migration team (/aegis-migrate)', value: 'aegis-migrate', checked: true },
  { name: 'Paradigm Advisor: detects paradigm gap between legacy and target stack', value: 'aegis-paradigm-advisor', checked: true },
  { name: 'Curator: decides what migrates, what gets discarded, what needs human decision', value: 'aegis-curator', checked: true },
  { name: 'Strategist: proposes migration strategies (Strangler, Big Bang, Parallel Run, Branch by Abstraction)', value: 'aegis-strategist', checked: true },
  { name: 'Designer: drafts target architecture, domain model, data model and migration plan', value: 'aegis-designer', checked: true },
  { name: 'Inspector: defines parity specs and Gherkin scenarios for behavioral equivalence', value: 'aegis-inspector', checked: true },
];

const TRANSLATORS = [
  { name: 'N8N Translator: converts N8N workflows (JSON) to SDD specs (/aegis-n8n)', value: 'aegis-n8n', checked: true },
];

const FORWARD_TEAM = [
  { name: 'Requirements: turns an idea into a full requirements doc anchored on the legacy (/aegis-requirements)', value: 'aegis-requirements', checked: true },
  { name: 'Tech Brief: translates the business requirements.md into a technical brief for the tech lead (/aegis-tech-brief)', value: 'aegis-tech-brief', checked: true },
  { name: 'Doubt: up to 5 directed questions to clear ambiguities (/aegis-doubt)', value: 'aegis-doubt', checked: true },
  { name: 'Plan: drafts technical approach as a delta over the legacy (/aegis-plan)', value: 'aegis-plan', checked: true },
  { name: 'To-Do: decomposes the roadmap into atomic actions (/aegis-to-do)', value: 'aegis-to-do', checked: true },
  { name: 'Audit: read-only cross-check between requirements/roadmap/actions (/aegis-audit)', value: 'aegis-audit', checked: true },
  { name: 'Quality: textual clarity audit of the requirements (/aegis-quality)', value: 'aegis-quality', checked: true },
  { name: 'Coding: executes actions, generates legacy-impact and regression-watch (/aegis-coding)', value: 'aegis-coding', checked: true },
  { name: 'Principles: creates/updates lasting project principles (/aegis-principles)', value: 'aegis-principles', checked: true },
  { name: 'Resume: reactivates a paused feature (swaps with currently active) (/aegis-resume)', value: 'aegis-resume', checked: true },
];

export const MIGRATION_AGENT_IDS = MIGRATION_TEAM.map(a => a.value);
export const TRANSLATOR_AGENT_IDS = TRANSLATORS.map(a => a.value);
export const FORWARD_AGENT_IDS = FORWARD_TEAM.map(a => a.value);

const P = { prefix: ORANGE_PREFIX };

export async function runInstallPrompts(detectedEngines) {
  const engineChoices = detectedEngines.map(e => ({
    name: `${e.name}${e.star ? ' ⭐' : ''}`,
    value: e.id,
    checked: e.detected,
  }));

  const answers = await inquirer.prompt([
    {
      ...P,
      type: 'checkbox',
      name: 'engines',
      message: 'Which engines do you want to support?',
      choices: engineChoices,
      loop: false,
      validate: (selected) => selected.length > 0 || 'Select at least one engine.',
    },
    {
      ...P,
      type: 'checkbox',
      name: 'optional_agents',
      message: 'Agents to install:',
      choices: [
        new inquirer.Separator('── Discovery Team (required) ──'),
        ...REQUIRED_AGENTS,
        new inquirer.Separator('── Discovery Team (optional) ──'),
        ...OPTIONAL_AGENTS,
        new inquirer.Separator('── Migration Team (optional) ──'),
        ...MIGRATION_TEAM,
        new inquirer.Separator('── Forward Cycle (optional, ideia → spec → código) ──'),
        ...FORWARD_TEAM,
        new inquirer.Separator('── Translators (optional) ──'),
        ...TRANSLATORS,
      ],
      loop: false,
    },
    {
      ...P,
      type: 'input',
      name: 'project_name',
      message: 'Project name:',
      default: process.cwd().split(/[\\/]/).pop(),
      validate: (v) => v.trim().length > 0 || 'Name cannot be empty.',
    },
    {
      ...P,
      type: 'input',
      name: 'user_name',
      message: 'What should the agents call you?',
      validate: (v) => v.trim().length > 0 || 'Name cannot be empty.',
    },
    {
      ...P,
      type: 'input',
      name: 'chat_language',
      message: 'Language for agent interactions:',
      default: 'pt-br',
    },
    {
      ...P,
      type: 'input',
      name: 'doc_language',
      message: 'Language for generated documents and specs:',
      default: 'Português',
    },
    {
      ...P,
      type: 'input',
      name: 'output_folder',
      message: 'Output folder for specs:',
      default: 'aegis',
    },
    {
      ...P,
      type: 'list',
      name: 'git_strategy',
      message: 'How to handle artifacts in git?',
      loop: false,
      choices: [
        { name: 'Commit with the project (recommended for teams)', value: 'commit' },
        { name: 'Add to .gitignore (personal use)', value: 'gitignore' },
      ],
    },
    {
      ...P,
      type: 'list',
      name: 'answer_mode',
      message: 'How do you prefer to answer agent questions?',
      loop: false,
      choices: [
        { name: 'In the chat (faster)', value: 'chat' },
        { name: 'In the questions.md file (more organized)', value: 'file' },
      ],
    },
    {
      ...P,
      type: 'confirm',
      name: 'install_git_hook',
      message: 'Install git pre-commit hook (runs aegis policy-check on staged diff)?',
      default: false,
    },
  ]);

  const requiredAgentValues = REQUIRED_AGENTS.map(a => a.value);
  return {
    ...answers,
    agents: [...requiredAgentValues, ...answers.optional_agents],
  };
}

export async function askMergeStrategy(filePath) {
  const { strategy } = await inquirer.prompt([
    {
      ...P,
      type: 'list',
      name: 'strategy',
      message: `The file "${filePath}" already exists. What to do?`,
      loop: false,
      choices: [
        { name: 'Merge: add Aegis Spec content at the end', value: 'merge' },
        { name: 'Skip: keep the file as is', value: 'skip' },
      ],
    },
  ]);
  return strategy;
}

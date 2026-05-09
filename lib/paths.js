import { join } from 'node:path';

/**
 * Centralized path constants for Aegis Spec single-folder layout.
 *
 * All paths are relative to project root.
 */

export const AEGIS_ROOT = 'aegis';

// Config — versioned, user-editable
export const CONFIG_DIR = join(AEGIS_ROOT, 'config');
export const STATE_JSON = join(CONFIG_DIR, 'state.json');
export const CONFIG_TOML = join(CONFIG_DIR, 'config.toml');
export const CONFIG_USER_TOML = join(CONFIG_DIR, 'config.user.toml');
export const MANIFEST_YAML = join(CONFIG_DIR, 'manifest.yaml');
export const FILES_MANIFEST_JSON = join(CONFIG_DIR, 'files-manifest.json');
export const SETUP_JSON = join(CONFIG_DIR, 'setup.json');
export const AUTO_POLICY_YAML = join(CONFIG_DIR, 'auto-policy.yaml');
export const AUDIT_POLICY_JSON = join(CONFIG_DIR, 'audit-policy.json');
export const VERSION_FILE = join(AEGIS_ROOT, 'version');
export const PLAN_MD = join(AEGIS_ROOT, 'plan.md');

// Runtime — generated, cache, state
export const RUNTIME_DIR = join(AEGIS_ROOT, 'runtime');
export const CONTEXT_DIR = join(RUNTIME_DIR, 'context');
export const GRAPH_JSON = join(CONTEXT_DIR, 'graph.json');
export const POLICY_INDEX_JSON = join(CONTEXT_DIR, 'policy-index.json');
export const QUEUE_DIR = join(RUNTIME_DIR, 'queue');
export const KEEPER_QUEUE_JSONL = join(QUEUE_DIR, 'keeper-queue.jsonl');
export const AUDIT_DIR = join(RUNTIME_DIR, 'audit');
export const SESSION_SUMMARIES_DIR = join(RUNTIME_DIR, 'session-summaries');
export const RUNTIME_TEMPLATES_DIR = join(RUNTIME_DIR, 'templates');
export const RUNTIME_SCRIPTS_DIR = join(RUNTIME_DIR, 'scripts');
export const RUNTIME_SCRIPTS_SH_DIR = join(RUNTIME_SCRIPTS_DIR, 'sh');
export const RUNTIME_SCRIPTS_PS_DIR = join(RUNTIME_SCRIPTS_DIR, 'ps');
export const RUNTIME_HOOKS_YML = join(RUNTIME_DIR, 'hooks.yml');

// Skills — installed agent skills
export const SKILLS_DIR = join(AEGIS_ROOT, 'skills');

// Specs — versioned documentation
export const SPECS_DIR = join(AEGIS_ROOT, 'specs');
export const SDD_DIR = join(SPECS_DIR, 'sdd');
export const USER_STORIES_DIR = join(SPECS_DIR, 'user-stories');
export const ADRS_DIR = join(SPECS_DIR, 'adrs');
export const OPENAPI_DIR = join(SPECS_DIR, 'openapi');
export const DATABASE_DIR = join(SPECS_DIR, 'database');
export const DESIGN_SYSTEM_DIR = join(SPECS_DIR, 'design-system');
export const UI_DIR = join(SPECS_DIR, 'ui');

// Changelog — append-only event log
export const CHANGELOG_DIR = join(AEGIS_ROOT, 'changelog');

// Reports — generated analysis
export const REPORTS_DIR = join(AEGIS_ROOT, 'reports');
export const DRIFT_MD = join(REPORTS_DIR, 'drift.md');
export const CONFIDENCE_REPORT_MD = join(REPORTS_DIR, 'confidence-report.md');
export const GAPS_MD = join(REPORTS_DIR, 'gaps.md');
export const QUESTIONS_MD = join(REPORTS_DIR, 'questions.md');
export const CODE_ANALYSIS_MD = join(REPORTS_DIR, 'code-analysis.md');

// Traceability — mapping files
export const TRACEABILITY_DIR = join(AEGIS_ROOT, 'traceability');
export const CODE_SPEC_MATRIX_MD = join(TRACEABILITY_DIR, 'code-spec-matrix.md');
export const SPEC_IMPACT_MATRIX_MD = join(TRACEABILITY_DIR, 'spec-impact-matrix.md');

// Architecture — high-level docs
export const ARCHITECTURE_DIR = join(AEGIS_ROOT, 'architecture');
export const ARCHITECTURE_MD = join(ARCHITECTURE_DIR, 'architecture.md');
export const C4_CONTEXT_MD = join(ARCHITECTURE_DIR, 'c4-context.md');
export const C4_CONTAINERS_MD = join(ARCHITECTURE_DIR, 'c4-containers.md');
export const C4_COMPONENTS_MD = join(ARCHITECTURE_DIR, 'c4-components.md');
export const ERD_COMPLETE_MD = join(ARCHITECTURE_DIR, 'erd-complete.md');

// Migration — migration artifacts
export const MIGRATION_DIR = join(AEGIS_ROOT, 'migration');

// Legacy paths — pre-2.0 layout. Only the migration commands
// (lib/commands/migrate-layout.js, lib/commands/migrate-reversa.js) should
// import these. Do not use in new code.
/** @deprecated migration-only — use AEGIS_ROOT */
export const LEGACY_AEGIS_ROOT = '.aegis';
/** @deprecated migration-only — use AEGIS_ROOT */
export const LEGACY_OUTPUT_FOLDER = '_aegis_sdd';
/** @deprecated migration-only — use SKILLS_DIR */
export const LEGACY_AGENTS_SKILLS = '.agents/skills';
/** @deprecated migration-only — use SKILLS_DIR */
export const LEGACY_CLAUDE_SKILLS = '.claude/skills';

/**
 * Resolves a relative path from project root.
 */
export function resolveFromRoot(projectRoot, relPath) {
  return join(projectRoot, relPath);
}

/**
 * Returns the configured Aegis output folder for a project (root of the
 * single-folder layout). Reads state.json's `output_folder`, falling back
 * to the default `aegis` root when state is missing or unreadable.
 *
 * Note: this is the layout root, not the specs subdirectory. For specs use
 * `join(getOutputFolder(root), 'specs')` or the SPECS_DIR constant relative
 * to AEGIS_ROOT.
 */
export async function getOutputFolder(projectRoot) {
  try {
    const { readFileSync } = await import('node:fs');
    const state = JSON.parse(readFileSync(join(projectRoot, STATE_JSON), 'utf8'));
    return state.output_folder ?? AEGIS_ROOT;
  } catch {
    return AEGIS_ROOT;
  }
}

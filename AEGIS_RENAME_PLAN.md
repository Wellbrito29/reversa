# Aegis Spec Rename Plan

Goal: full rename, not cosmetic. `reversa`, `.reversa`, `_reversa_sdd`, `reversa-*`, and `/reversa` become `aegis`, `.aegis`, `_aegis_sdd`, `aegis-*`, and `/aegis`.

Keep fork credit: Aegis Spec remains documented as a fork of Reversa by sandeco.

## Phase 0: Decisions

Actions:
- Product name: `Aegis Spec`.
- npm package: `aegis-spec`.
- CLI: `aegis`.
- Runtime dir: `.aegis`.
- Default specs output: `_aegis_sdd`.
- Agent IDs: `aegis-*`.
- Slash commands: `/aegis-*`.
- Decide compatibility policy: keep `reversa` alias with warning for one release, or remove directly.

Checkpoint:
- Naming matrix approved.
- Compatibility policy approved.

## Phase 1: Inventory

Actions:
- Search all uses of `reversa`, `Reversa`, `.reversa`, `_reversa_sdd`, `/reversa`, `reversa-*`, and `npx reversa`.
- Categorize hits: code, docs, templates, agents, CI, bot, smoke checks.
- Mark historical exceptions: fork credit, migration guide, upstream URLs, changelog.

Checkpoint:
- Complete affected file list exists.
- Historical references to keep are explicit.

## Phase 2: Package And CLI

Actions:
- Update `package.json` name to `aegis-spec`.
- Update `package.json` bin to expose `aegis` via `bin/aegis.js`.
- Create or rename CLI entrypoint to `bin/aegis.js`.
- Update banner, version output, help text, and usage examples.
- Replace command examples: `npx reversa install` -> `npx aegis-spec install`; `reversa graph build` -> `aegis graph build`.

Checkpoint:
- `node bin/aegis.js --help` shows Aegis Spec.
- `node bin/aegis.js --version` works.
- Main CLI output no longer presents product as Reversa.

## Phase 3: Runtime Paths

Actions:
- Rename `.reversa/` runtime path to `.aegis/`.
- Update state path: `.aegis/state.json`.
- Update graph path: `.aegis/context/graph.json`.
- Update config path: `.aegis/_config/`.
- Update keeper queue path: `.aegis/keeper-queue.jsonl`.
- Update hooks, templates, scripts, setup, and audit paths under `.aegis/`.
- Update `.gitignore` entries to `.aegis/`.
- Update `templates/state.json` and `templates/config.toml` references.

Checkpoint:
- `aegis install` creates `.aegis/`, not `.reversa/`.
- `aegis graph build` writes `.aegis/context/graph.json`.
- `aegis status` reads `.aegis/state.json`.

## Phase 4: Specs Output

Actions:
- Rename default output `_reversa_sdd/` to `_aegis_sdd/`.
- Update installer prompts, templates, docs, and config defaults.
- Update auto policy path to `_aegis_sdd/auto-policy.yaml`.
- Update `drift-check`, `keeper-auto`, `policy-index`, and `policy-check` defaults.
- Document manual movement of old specs in migration guide.

Checkpoint:
- New install defaults to `_aegis_sdd`.
- `keeper auto` looks for `_aegis_sdd/auto-policy.yaml`.
- `drift-check` default output folder is `_aegis_sdd`.

## Phase 5: Agents And Slash Commands

Actions:
- Rename agent folders: `agents/reversa` -> `agents/aegis`; every `agents/reversa-*` -> `agents/aegis-*`.
- Update agent frontmatter names, command examples, and internal references.
- Update installer agent IDs in `prompts.js`.
- Update engine templates for `/aegis`, `/aegis-keeper`, `/aegis-n8n`, `/aegis-migrate`, etc.
- Update agent docs.

Checkpoint:
- `aegis install` copies `.agents/skills/aegis-*`.
- New installs do not create `reversa-*` skills.
- Main slash command is `/aegis`.

## Phase 6: Hooks, Policy, And Bot

Actions:
- Update hook command text from `/reversa-keeper before|after` to `/aegis-keeper before|after`.
- Update policy block messages from `reversa policy block` to `aegis policy block`.
- Update bot CLI invocations from `npx reversa` to `npx aegis-spec`.
- Update PR comments and labels text to Aegis Spec.
- Update CI templates to use `npx aegis-spec policy-index build`, `npx aegis-spec policy-check`, and `npx aegis-spec keeper auto`.

Checkpoint:
- `aegis add-hooks --engine=opencode --yes` generates Aegis hook references.
- Bot handler calls `npx aegis-spec`.
- CI templates do not use `npx reversa`.

## Phase 7: Docs And Branding

Actions:
- Rename README title to `Aegis Spec`.
- Keep fork credit: `Aegis Spec is a fork of Reversa by sandeco`.
- Keep upstream base note and commit reference.
- Update badges, repo URLs, commands, screenshots, and product descriptions.
- Update docs in EN/PT/ES.
- Update `mkdocs.yml` `site_name`, `repo_name`, `site_url`, and navigation labels where needed.

Checkpoint:
- Search for `Reversa` only returns historical/fork/migration references.
- Search for `reversa` only returns upstream URLs, migration docs, or historical notes.
- Main docs teach Aegis Spec only.

## Phase 8: Backward Migration

Actions:
- Add command: `aegis migrate-reversa`.
- Detect `.reversa/`.
- Copy or move `.reversa/` to `.aegis/`.
- Detect `_reversa_sdd/`.
- Copy or move `_reversa_sdd/` to `_aegis_sdd/`.
- Update state/config paths and default output folder.
- Rename installed agent IDs from `reversa-*` to `aegis-*`.
- Preserve backups: `.reversa.backup-*` and `_reversa_sdd.backup-*`.
- Do not migrate silently during `install`.

Checkpoint:
- Existing Reversa install can migrate explicitly.
- Backups are created.
- `aegis status` works after migration.

## Phase 9: Lockfile And Package Contents

Actions:
- Update `package-lock.json` to match `package.json`.
- Confirm optional dependencies reflect current package manifest.
- Ensure `files` includes `bin/aegis.js`, renamed agents, and updated templates.
- Remove obsolete Reversa operational files, unless compatibility policy keeps wrappers.

Checkpoint:
- `npm pack --dry-run` shows `aegis-spec`.
- Tarball does not include obsolete operational Reversa files, except historical docs or compatibility wrappers.
- Lockfile package name/version match `package.json`.

## Phase 10: Final Validation

Commands:

```bash
node bin/aegis.js --help
node bin/aegis.js --version
node --check bin/aegis.js
node --check lib/**/*.js
node --check bot/**/*.js
node bin/aegis.js graph build --json
node bin/aegis.js graph build --level L1 --json
npm pack --dry-run
```

Checkpoint:
- All validation commands pass.
- Graph writes to `.aegis/`.
- No operational `reversa` reference remains.

## Phase 11: Release

Actions:
- Update version.
- Add `docs/migration-reversa-to-aegis.md`.
- Write release notes covering package/CLI rename, runtime path change, output folder change, agent ID change, slash command change, and migration command.
- Publish package as `aegis-spec`.

Checkpoint:
- New user installs with `npx aegis-spec install`.
- Existing user migrates with `npx aegis-spec migrate-reversa`.

## Done Criteria

- `reversa` is not the primary operational command.
- New install does not create `.reversa`, `_reversa_sdd`, or `reversa-*`.
- Main docs use `Aegis Spec`.
- Fork reference remains only as credit/history/migration context.
- Old projects have explicit migration path.

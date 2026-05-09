# Migrating from Reversa to Aegis Spec

Aegis Spec is a fork of Reversa with a broader scope: not just legacy discovery, but a full control plane for AI-assisted development (specs, graph, drift detection, policy gates, and Keeper).

This guide helps you migrate an existing Reversa installation.

## What changed

| Reversa | Aegis Spec |
|---|---|
| Package `reversa` | `aegis-spec` |
| CLI `reversa` | `aegis` |
| Runtime dir `.reversa/` | `aegis/` |
| Output folder `_reversa_sdd/` | `aegis/` |
| Agent IDs `reversa-*` | `aegis-*` |
| Slash command `/reversa` | `/aegis` |

## Automatic migration

If you have an existing Reversa install (`.reversa/` or `_reversa_sdd/`):

```bash
npx aegis-spec migrate-reversa
```

This command:

1. Copies `.reversa/` → `aegis/`
2. Renames `_reversa_sdd/` → `aegis/`
3. Updates agent IDs in `state.json` from `reversa-*` to `aegis-*`
4. Leaves backups in place; nothing is deleted

## Manual migration

If you prefer to migrate manually:

```bash
# Runtime state
cp -r .reversa .aegis

# Update agent IDs in state.json
sed -i 's/reversa-/aegis-/g' aegis/config/state.json

# Specs output
mv _reversa_sdd _aegis_sdd
```

## After migration

1. Update your engine entry files (`CLAUDE.md`, `AGENTS.md`, etc.) to use `/aegis` instead of `/reversa`.
2. Update CI workflows to use `npx aegis-spec` instead of `npx reversa`.
3. Remove old `.reversa/` and `_reversa_sdd/` directories when you are confident everything works.

## New installs

For new projects, simply run:

```bash
npx aegis-spec install
```

No migration needed.

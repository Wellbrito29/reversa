# Hooks (auto Keeper)

Install hook configuration in your AI engine so the Keeper runs automatically every time you edit a file.

Manual `/aegis-keeper after` always works as a fallback. Hooks just remove the friction.

---

## Quick start

```bash
npx aegis-spec add-hooks --engine claude-code   # or cursor, kimi-cli, codex, opencode
```

You will see a preview of exactly what will be written. Confirm to install.

To uninstall:

```bash
npx aegis-spec remove-hooks --engine claude-code
npx aegis-spec remove-hooks --all                # all engines at once
```

---

## What the hook does

When the engine triggers a tool that edits a file (`Edit`, `Write`, `MultiEdit`, `apply_patch`, `afterFileEdit`, etc.), the hook invokes the **Aegis Spec hook runner** — a small Node script installed at `aegis/runtime/hooks/runner.js`.

The runner:

1. Appends an entry to `aegis/runtime/queue/keeper-queue.jsonl` (with a lock to handle concurrent edits)
2. Writes a stub to `aegis/changelog/YYYY-MM-DD.md` so the change is at least mentioned even if you never run the Keeper
3. Marks affected specs as `🔴 pending` in `aegis/reports/drift.md`
4. Prints a warning to your terminal if a high-confidence spec was touched

The runner **never blocks** the engine and **never modifies your code**. Errors are silently logged to `aegis/runtime/audit/keeper-errors.log`.

Later, when you run `/aegis-keeper after`, the agent reads the queue, asks the 3 questions, enriches the changelog, updates the specs, and clears the queue.

---

## Supported engines

| Engine | File | Events |
|---|---|---|
| Claude Code | `.claude/settings.json` | PreToolUse + PostToolUse (matcher `Edit\|Write\|MultiEdit`) |
| Cursor | `.cursor/hooks.json` | afterFileEdit (matcher `**/*`) |
| Kimi CLI | `.kimi/config.toml` (project) or `~/.kimi/config.toml` (global, with backup) | PreToolUse + PostToolUse (matcher `Edit\|Write`) |
| Codex | `.codex/hooks.toml` | PreToolUse + PostToolUse (matcher `apply_patch`) |
| Opencode | `.opencode/plugins/aegis-keeper.js` | tool.execute.before/after |

For engines not listed (Gemini CLI, Aider, Roo, Cline, Copilot, Windsurf, Antigravity, Kiro, Amazon Q): use the manual `/aegis-keeper` workflow.

---

## Safety guarantees

- **Preview before write.** `add-hooks` shows the exact JSON or TOML it will write and asks for confirmation.
- **No blind overwrites.** When merging into a config file that already exists (e.g. `.claude/settings.json`), Aegis Spec preserves all existing keys and hook entries. Only entries identified by the marker `aegis-spec/runtime/hooks/runner.js` in the command string are touched.
- **Backup for global configs.** When editing `~/.kimi/config.toml`, a timestamped backup is saved as `~/.kimi/config.toml.bak.aegis-<ISO>`.
- **Idempotent install.** Running `add-hooks` twice for the same engine replaces the previous Aegis Spec hooks; it does not duplicate.
- **Clean uninstall.** `remove-hooks` strips only Aegis Spec-managed entries. Other hooks you added manually are preserved. `npx aegis-spec uninstall` does the same automatically.

---

## Custom CI integration

Hooks fire only inside the engine. To enforce drift resolution on pull requests, pair hooks with [`npx aegis-spec drift-check`](drift-check.md) in CI.

```yaml
# .github/workflows/ci.yml
- name: Aegis Spec drift gate
  run: npx aegis-spec drift-check --severity high
```

This way: hooks keep the queue and dashboard fresh as developers code locally, and CI blocks merges if anything was left unresolved.

---

## Architecture diagram

```
[Edit/Write in engine]
        │
        ▼
[Engine hook → spawns runner]
        │
        ▼
[aegis/runtime/hooks/runner.js]
        ├─→ append aegis/runtime/queue/keeper-queue.jsonl
        ├─→ stub aegis/changelog/YYYY-MM-DD.md
        ├─→ mark aegis/reports/drift.md as pending
        └─→ stderr warning (high-confidence specs only)
        │
        ▼ (later, when developer runs the agent)
[/aegis-keeper after]
        ├─→ asks 3 questions (why / breaking / context)
        ├─→ enriches changelog
        ├─→ updates specs in-place + reclassifies confidence
        ├─→ marks drift.md as resolved
        └─→ clears queue
        │
        ▼ (in CI)
[npx aegis-spec drift-check]
        └─→ exit 1 if drift.md still has pending → blocks merge
```

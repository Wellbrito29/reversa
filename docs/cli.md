# CLI

Aegis Spec has a simple CLI to manage the installation and lifecycle of agents in your project. All commands run with `npx aegis-spec` in the project root.

---

## Available commands

### `install`

```bash
npx aegis-spec install
```

Installs Aegis Spec in the current legacy project. Detects present engines, asks for your preferences, and creates the entire required structure.

Use once, in the root of the project you want to analyze.

---

### `status`

```bash
npx aegis-spec status
```

Shows the current analysis state: which phase is in progress, which agents have already run, what's left to complete.

Useful for a quick overview before resuming a session.

---

### `update`

```bash
npx aegis-spec update
```

Updates agents to the latest version of Aegis Spec.

The command is smart: it checks the SHA-256 manifest of each file and never overwrites files you've customized. If you made adjustments to any agent, they stay intact.

---

### `add-agent`

```bash
npx aegis-spec add-agent
```

Adds a specific agent to the project. Useful if you didn't install all agents during the initial installation and now want to include, for example, Data Master or Design System.

---

### `add-engine`

```bash
npx aegis-spec add-engine
```

Adds support for an AI engine that wasn't present when you installed. For example: you installed only for Claude Code and now want to add Codex.

---

### `uninstall`

```bash
npx aegis-spec uninstall
```

Removes Aegis Spec from the project: deletes the files created by the installation (`aegis/`, `aegis/skills/aegis-*/`, engine entry files). Hooks installed by `add-hooks` are also stripped.

!!! info "Your files stay intact"
    `uninstall` removes **only** what Aegis Spec created. No original project file is touched. Specifications generated in `aegis/` are also preserved by default.

---

### `add-hooks`

```bash
npx aegis-spec add-hooks --engine claude-code
```

Installs Keeper hooks in your engine's config so the agent runs automatically after every file edit. Shows a preview, asks confirmation, then writes.

Supported engines: `claude-code`, `cursor`, `kimi-cli`, `codex`, `opencode`. See [Hooks](hooks.md) for the full reference.

---

### `remove-hooks`

```bash
npx aegis-spec remove-hooks --engine claude-code
npx aegis-spec remove-hooks --all
```

Strips Keeper hooks from the engine config. Other hooks you added manually are preserved.

---

### `drift-check`

```bash
npx aegis-spec drift-check
npx aegis-spec drift-check --severity medium --format json
```

CI gate. Reads `aegis/reports/drift.md` and exits 1 if there are pending specs at the chosen severity. Engine-agnostic — no agent code is loaded. See [drift-check](drift-check.md) for the full reference.

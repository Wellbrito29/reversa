# Migrating from Aegis Spec 1.x to 2.0

Aegis Spec 2.0 adds the **Stage 4 control plane**: a knowledge graph, a
signature-aware policy gate, an LLM-driven keeper, an audit log, and a
GitHub bot scaffold. Stages 1–3 are unchanged.

## Compatibility

- Existing specs under `aegis/specs/sdd/` keep working as-is.
- The drift queue (`aegis/runtime/queue/keeper-queue.jsonl`) format is unchanged.
- All new behavior is opt-in: the policy gate only blocks files declared
  protected, the auto keeper only runs when `auto_resolve.enabled: true`,
  and the LLM is only called when an `ANTHROPIC_API_KEY` is present.

## What changed

| Area | 1.x behavior | 2.0 behavior |
|---|---|---|
| Hooks runner | Append to queue | Append to queue + run pre-edit policy gate |
| Spec frontmatter | `protected: true` only | + `contracts: [{ name, file, protected, reason }]` and `protected_files: ["glob/**"]` |
| Drift triage | HITL only | HITL by default; auto-mode opt-in (`aegis/config/auto-policy.yaml`) |
| CI | `drift-check` | + `policy-check` (signature gate) and optional `keeper auto` |
| Audit | none | `aegis/runtime/audit/YYYY-MM-DD.jsonl` (append-only, optionally redacted) |

## Step-by-step

### 1. Update Aegis Spec

```bash
npm install -g aegis@latest
```

### 2. (Optional) Mark contracts protected

In any spec under `aegis/specs/sdd/`, add frontmatter:

```yaml
---
contracts:
  - name: login
    file: src/auth/login.js
    protected: true
    reason: "public auth API"
protected_files:
  - "src/api/public/**"
---
```

Then build the index:

```bash
npx aegis-spec policy-index build
```

### 3. (Optional) Wire CI

Pick the template that matches your CI:

- GitHub Actions: `templates/ci/github-actions-full.yml`
- GitLab CI: `templates/ci/gitlab-ci-full.yml`
- CircleCI: `templates/ci/circleci-full.yml`

The `keeper-auto` job is gated by `ANTHROPIC_API_KEY` — leaving the secret
unset disables auto mode but keeps drift-check + policy-check active.

### 4. (Optional) Enable auto mode

Copy `templates/auto-policy.example.yaml` to
`aegis/config/auto-policy.yaml`, set `enabled: true`, and tune the
whitelist / blacklist / `confidence_threshold`. Run with `--dry-run`
first to see how the policy routes your queue.

### 5. (Optional) Install the local pre-commit hook

```bash
node -e "import('aegis-spec/lib/installer/git-hooks.js').then(m => m.installGitHook(process.cwd()))"
```

This catches signature breaks before they ever reach CI.

## Rollback

`aegis-spec@1.x` and `aegis-spec@2.x` read the same `aegis/`. Pinning
back to 1.x in `package.json` is sufficient — the only artifacts the 2.x
pipeline produces (graph, policy index, audit log) live under `aegis/`,
which 1.x ignores.

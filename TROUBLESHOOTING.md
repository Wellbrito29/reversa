# Troubleshooting Guide

Common issues and solutions for Aegis Spec.

## Installation Issues

### Error: "Cannot install Aegis in system root or home directory"

**Problem:** Trying to install in `/` or `~` (home directory).

**Solution:** Navigate to your project directory first:
```bash
cd /path/to/your/project
npx aegis-spec install
```

### Error: "aegis/ exists but appears incomplete"

**Problem:** Partial/corrupted aegis/ directory from previous failed install.

**Solution:** Choose "Remove existing aegis/ and start fresh" when prompted, or manually:
```bash
rm -rf aegis/
npx aegis-spec install
```

### Error: "EACCES: permission denied"

**Problem:** No write permissions in project directory.

**Solution:** Check directory ownership:
```bash
ls -la .
# If owned by root/another user:
sudo chown -R $USER:$USER .
```

## Graph Commands

### Error: "Not a git repository. --since requires git."

**Problem:** Using `--since` flag without git repo.

**Solution:** Initialize git first:
```bash
git init
git add .
git commit -m "Initial commit"
npx aegis-spec graph build --since=HEAD
```

Or build without `--since`:
```bash
npx aegis-spec graph build
```

### Error: "No graph found. Run: npx aegis-spec graph build"

**Problem:** Trying to query graph before building it.

**Solution:** Build graph first:
```bash
npx aegis-spec graph build
npx aegis-spec graph stats  # now works
```

### Error: "File not in graph: src/myfile.js"

**Problem:** File was added after last graph build.

**Solution:** Rebuild graph:
```bash
npx aegis-spec graph build --files=src/myfile.js  # incremental
# or
npx aegis-spec graph build  # full rebuild
```

## Keeper Commands

### Error: "aegis/ not found. Run: npx aegis-spec install"

**Problem:** Running keeper in non-Aegis project.

**Solution:** Install Aegis first:
```bash
npx aegis-spec install
# Then setup keeper hooks:
npx aegis-spec add-hooks --engine=claude-code
```

### Error: "ANTHROPIC_API_KEY not set. Required for live mode"

**Problem:** Running `keeper auto` without dry-run, but no API key.

**Solution:** Export API key or use dry-run:
```bash
# Option 1: Dry-run (no LLM calls)
npx aegis-spec keeper auto --dry-run

# Option 2: Set API key
export ANTHROPIC_API_KEY=sk-ant-...
npx aegis-spec keeper auto
```

### Error: "auto_resolve disabled in auto-policy.yaml"

**Problem:** Keeper auto mode disabled by policy.

**Solution:** Enable in `aegis/config/auto-policy.yaml`:
```yaml
auto_resolve:
  enabled: true
  max_specs_per_pr: 10
  llm:
    model: "claude-3-5-sonnet-20241022"
    fallback: "claude-3-5-haiku-20241022"
```

## Agent Activation

### Agent doesn't respond to `/aegis` command

**Problem:** Slash command not recognized by engine.

**Solutions:**

1. **Claude Code/Cursor**: Reload window
   - VS Code: `Ctrl+Shift+P` → "Reload Window"
   - Verify `CLAUDE.md` or `.cursorrules` exists

2. **Codex/Kimi/Opencode**: Use without slash
   ```
   aegis
   ```

3. **Check skill installation**:
   ```bash
   ls aegis/skills/aegis/SKILL.md
   # Should exist
   ```

### Agent says "File not found: aegis/config/state.json"

**Problem:** Incomplete installation.

**Solution:** Reinstall:
```bash
npx aegis-spec install
```

## Performance Issues

### `graph build` takes >5 minutes

**Problem:** Large repo with many files.

**Solutions:**

1. **Use incremental build**:
   ```bash
   git add .
   git commit -m "WIP"
   npx aegis-spec graph build --since=HEAD~1
   ```

2. **Exclude large dirs** (edit `.gitignore` patterns):
   - `node_modules/`
   - `dist/`, `build/`
   - `*.min.js`

3. **Build only specific files**:
   ```bash
   npx aegis-spec graph build --files=src/,lib/
   ```

### Agents run slow / timeout

**Problem:** Large codebase overwhelming LLM context.

**Solutions:**

1. **Run Archaeologist per module** (not all at once):
   ```
   /aegis-archaeologist src/auth
   /aegis-archaeologist src/billing
   ```

2. **Use smaller doc_level**:
   - Edit `aegis/config/config.toml`:
     ```toml
     doc_level = "essencial"  # instead of "completo"
     ```

3. **Skip optional phases**:
   - Skip Visor if no screenshots
   - Skip Design System if no CSS
   - Skip Data Master if no database

## CI/CD Issues

### `drift-check` fails with "No graph found"

**Problem:** Graph not in CI cache.

**Solution:** Build graph in CI before drift-check:
```yaml
# .github/workflows/pr.yml
- name: Build graph
  run: npx aegis-spec graph build

- name: Check drift
  run: npx aegis-spec drift-check --severity=high
```

### `policy-check` fails with "No policy index"

**Problem:** Policy index not built.

**Solution:** Build index first:
```yaml
- name: Build policy index
  run: npx aegis-spec policy-index build

- name: Check policy
  run: npx aegis-spec policy-check --base=origin/main --head=HEAD
```

### Hooks not triggering in CI

**Problem:** Hooks are for local dev, not CI.

**Solution:** Don't install hooks in CI. Use gates instead:
```yaml
# Run gates, not hooks
- run: npx aegis-spec drift-check
- run: npx aegis-spec policy-check
```

## Common Errors

### SyntaxError: Unexpected token 'export'

**Problem:** Running with Node.js <18 or CommonJS mode.

**Solution:** Upgrade Node:
```bash
node --version  # Should be 18+
nvm install 20
nvm use 20
```

### Error: Cannot find module 'chalk'

**Problem:** Dependencies not installed.

**Solution:**:
```bash
cd /path/to/aegis-install
npm install
```

### ENOENT: no such file or directory, open 'aegis/config/state.json'

**Problem:** Running commands before installation.

**Solution:** Install first:
```bash
npx aegis-spec install
```

## Getting Help

If your issue isn't covered here:

1. **Check logs**: `aegis/runtime/audit/YYYY-MM-DD.jsonl`
2. **Run with verbose**: `DEBUG=aegis:* npx aegis-spec <command>`
3. **Open issue**: https://github.com/Wellbrito29/Aegis/issues
   - Include: Node version, OS, command run, full error output

## Debug Mode

Enable debug logging:

```bash
# All debug output
DEBUG=aegis:* npx aegis-spec graph build

# Specific modules
DEBUG=aegis:graph npx aegis-spec graph build
DEBUG=aegis:keeper npx aegis-spec keeper auto
```

## Clean Slate

If all else fails, start fresh:

```bash
# Backup specs if you want to keep them
cp -r aegis/ aegis-backup/

# Remove everything Aegis-related
rm -rf aegis/ .aegis/ CLAUDE.md AGENTS.md .cursorrules

# Reinstall
npx aegis-spec install
```

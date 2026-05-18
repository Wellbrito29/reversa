# Contributing to Aegis Spec

Thank you for contributing to Aegis Spec! This guide will help you get started.

## Code of Conduct

Be respectful, constructive, and professional. We're all here to improve AI-assisted development.

## How to Contribute

### Reporting Bugs

Open an issue with:
- **Title**: Clear, specific description
- **Environment**: Node version, OS, Aegis version
- **Steps to reproduce**: Minimal example
- **Expected vs actual**: What should happen vs what does
- **Logs**: Error messages, stack traces

Example:
```
Title: graph build fails on Windows with spaces in path

Environment: Node 20.10, Windows 11, Aegis 2.0.1

Steps:
1. Install Aegis in `C:\My Projects\test-project`
2. Run `npx aegis-spec graph build`

Expected: Graph builds successfully
Actual: Error: ENOENT: no such file or directory

Logs:
Error: spawn git ENOENT
    at Process.ChildProcess._handle.onexit (node:internal/child_process:284:19)
```

### Suggesting Features

Open an issue with:
- **Use case**: What problem does this solve?
- **Proposed solution**: How would it work?
- **Alternatives**: What else did you consider?
- **Impact**: Who benefits? Breaking changes?

We prioritize features that:
- Improve agent accuracy/safety
- Reduce manual work in spec maintenance
- Support more engines/languages
- Fix production pain points

### Submitting Pull Requests

1. **Fork the repo**:
   ```bash
   git clone https://github.com/Wellbrito29/Aegis.git
   cd Aegis
   npm install
   ```

2. **Create a branch**:
   ```bash
   git checkout -b feat/my-feature
   # or
   git checkout -b fix/my-bugfix
   ```

3. **Make changes**:
   - Follow existing code style
   - Add tests for new features
   - Update docs if behavior changes

4. **Test locally**:
   ```bash
   # Run unit tests
   node --test test/unit/**/*.test.js
   
   # Run smoke test
   bash test/smoke.sh
   
   # Test in real project
   cd /path/to/test-project
   npx /path/to/Aegis/bin/aegis.js install --non-interactive
   ```

5. **Commit**:
   ```bash
   git add .
   git commit -m "feat: add support for Python AST parsing"
   ```
   
   Use conventional commits:
   - `feat`: New feature
   - `fix`: Bug fix
   - `docs`: Documentation only
   - `test`: Adding/fixing tests
   - `refactor`: Code restructure, no behavior change
   - `perf`: Performance improvement
   - `chore`: Tooling, dependencies, etc

6. **Push and open PR**:
   ```bash
   git push origin feat/my-feature
   ```
   
   In PR description:
   - Link to related issue (`Closes #123`)
   - Explain what changed and why
   - Add screenshots/demos if UI change
   - List breaking changes if any

## Development Setup

### Prerequisites

- Node.js 20+ (we use native test runner)
- Git
- A test project to validate changes

### Project Structure

```
aegis/
├── bin/aegis.js           # CLI entry point
├── lib/
│   ├── commands/          # CLI commands (install, graph, keeper, etc)
│   ├── graph/             # Dependency graph builder
│   ├── auto/              # Keeper auto-resolution
│   ├── installer/         # Installation logic
│   ├── state/             # State management
│   └── utils/             # Shared utilities
├── agents/                # Agent SKILL.md definitions
├── templates/             # File templates for install
├── test/
│   ├── unit/              # Unit tests
│   ├── fixtures/          # Test fixtures
│   ├── _helpers.js        # Test utilities
│   ├── smoke.sh           # Smoke test
│   └── smoke-keeper.sh    # Keeper smoke test
└── docs/                  # MkDocs documentation
```

### Running Tests

```bash
# All unit tests
node --test test/unit/**/*.test.js

# Specific test file
node --test test/unit/commands/graph.test.js

# Smoke tests
bash test/smoke.sh
bash test/smoke-keeper.sh

# Watch mode (requires Node 22+)
node --test --watch test/unit/**/*.test.js
```

### Code Style

- **ES modules**: Use `import`/`export`, not `require`
- **Modern JS**: async/await, destructuring, template literals
- **No semicolons**: We use ASI (automatic semicolon insertion)
- **2-space indent**: Match existing code
- **Descriptive names**: `buildGraph()` not `bg()`
- **JSDoc for public APIs**: Help editors with autocomplete

Example:
```javascript
/**
 * Build L0 dependency graph from source files.
 * @param {string} projectRoot - Absolute path to project root
 * @returns {Graph} Graph object with nodes and edges
 */
export function buildGraph(projectRoot) {
  const files = findSourceFiles(projectRoot)
  // ...
}
```

### Adding a New CLI Command

1. Create `lib/commands/my-command.js`:
   ```javascript
   export default async function myCommand(args) {
     const opts = parseArgs(args)
     // Implementation
   }
   
   function parseArgs(args) {
     const out = { flag: false }
     for (let i = 0; i < args.length; i++) {
       const a = args[i]
       if (a === '--flag') out.flag = true
       else out.positional = a
     }
     return out
   }
   ```

2. Register in `bin/aegis.js`:
   ```javascript
   const commands = {
     // ...
     'my-command': () => import('../lib/commands/my-command.js'),
   }
   ```

3. Add help text in `bin/aegis.js` usage string

4. Write tests in `test/unit/commands/my-command.test.js`:
   ```javascript
   import { test } from 'node:test'
   import assert from 'node:assert/strict'
   import { runCommand, makeTmpProject, cleanup } from '../../_helpers.js'
   
   test('my-command: basic usage', async (t) => {
     const root = makeTmpProject()
     t.after(() => cleanup(root))
     
     const r = await runCommand('my-command', ['--flag'], { cwd: root })
     assert.equal(r.exitCode, 0)
   })
   ```

### Adding a New Agent

1. Create `agents/aegis-my-agent/SKILL.md`:
   ```markdown
   ---
   name: aegis-my-agent
   description: Short description of what agent does
   license: MIT
   compatibility: Claude Code, Codex, Cursor
   metadata:
     author: YourName
     version: "1.0.0"
     framework: aegis-spec
     phase: discovery
   ---
   
   Agent instructions here...
   ```

2. Add to installer's agent list in `lib/installer/prompts.js`

3. Test installation:
   ```bash
   npx aegis-spec install
   # Select your new agent
   # Verify skill copied to aegis/skills/aegis-my-agent/
   ```

### Updating Documentation

Docs are in `docs/` (MkDocs format):

```bash
# Install MkDocs
pip install mkdocs-material

# Preview locally
mkdocs serve
# Visit http://localhost:8000

# Build
mkdocs build
```

### Performance Considerations

- **Graph builds** can be slow on large repos (1000+ files)
  - Use incremental builds (`--since`, `--files`)
  - Skip parse-heavy operations when possible
  - Profile with `console.time()` for bottlenecks

- **Keeper LLM calls** are expensive
  - Use prompt caching (we do)
  - Batch operations when possible
  - Dry-run mode for testing

- **File I/O** can block
  - Read files in parallel (`Promise.all`)
  - Stream large files if needed
  - Cache frequently accessed files

## Release Process

Maintainers only:

1. Update version in `package.json`
2. Update `CHANGELOG.md` with changes
3. Commit: `chore: release v2.1.0`
4. Tag: `git tag v2.1.0`
5. Push: `git push origin main --tags`
6. GitHub Actions publishes to npm automatically

## Questions?

- **Usage questions**: Open a discussion
- **Bug reports**: Open an issue
- **Feature ideas**: Open an issue
- **Code questions**: Comment on PR or issue

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

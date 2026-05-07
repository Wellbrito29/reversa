// `npx aegis-spec drift-check [--format text|json] [--severity high|medium|low] [--folder <path>]`
//
// Standalone CLI gate for CI. Engine-agnostic — does NOT load chalk,
// inquirer, or any agent code. Just parses aegis/reports/drift.md and
// exits with a useful code.
//
// Exit codes:
//   0 — clean (no pending drift at chosen severity)
//   1 — drift detected at chosen severity
//   2 — aegis/reports/drift.md not found (project not initialized)
//
// Severity:
//   high   = only `pending` blocks
//   medium = `pending` + `stale` block
//   low    = always exit 0; reports counts only

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

function parseArgs(args) {
  const out = { format: 'text', severity: 'high', folder: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--format' || a === '-f') out.format = args[++i];
    else if (a.startsWith('--format=')) out.format = a.slice('--format='.length);
    else if (a === '--severity' || a === '-s') out.severity = args[++i];
    else if (a.startsWith('--severity=')) out.severity = a.slice('--severity='.length);
    else if (a === '--folder') out.folder = args[++i];
    else if (a.startsWith('--folder=')) out.folder = a.slice('--folder='.length);
  }
  return out;
}

function detectOutputFolder(projectRoot, override) {
  if (override) return override;
  const statePath = join(projectRoot, '.aegis', 'state.json');
  if (existsSync(statePath)) {
    try {
      const state = JSON.parse(readFileSync(statePath, 'utf8'));
      if (state.output_folder) return state.output_folder;
    } catch { /* ignore */ }
  }
  return 'aegis';
}

function parseDriftMd(content) {
  // Look for table rows. Each row format:
  //   | `spec/path.md` | TIMESTAMP | EMOJI status | DIST | ACTION |
  // We extract the spec name (col 1) and status (col 3).
  const lines = content.split('\n');
  const entries = [];
  for (const line of lines) {
    if (!line.startsWith('|')) continue;
    if (line.includes('---')) continue; // header separator
    if (line.toLowerCase().includes('última sincronização') || line.toLowerCase().includes('last synced')) continue;

    const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
    if (cells.length < 4) continue;

    const specCell = cells[0];
    const statusCell = cells[2];

    if (!statusCell) continue;
    let status = null;
    if (statusCell.includes('🔴') || /\bpending\b/i.test(statusCell)) status = 'pending';
    else if (statusCell.includes('🟡') || /\bstale\b/i.test(statusCell)) status = 'stale';
    else if (statusCell.includes('🟢') || /\bresolved\b/i.test(statusCell)) status = 'resolved';
    if (!status) continue;

    const specMatch = specCell.match(/`([^`]+)`/);
    const spec = specMatch ? specMatch[1] : specCell;

    entries.push({ spec, status, action: cells[4] ?? '' });
  }
  return entries;
}

function classify(entries, severity) {
  const pending = entries.filter((e) => e.status === 'pending');
  const stale = entries.filter((e) => e.status === 'stale');
  const resolved = entries.filter((e) => e.status === 'resolved');

  let blocking;
  if (severity === 'low') blocking = [];
  else if (severity === 'medium') blocking = [...pending, ...stale];
  else blocking = pending; // high (default)

  return { pending, stale, resolved, blocking };
}

function reportText(driftPath, summary, opts) {
  const { pending, stale, resolved, blocking } = summary;
  const lines = [];
  lines.push('');
  lines.push(`aegis drift-check (severity=${opts.severity})`);
  lines.push(`  source: ${driftPath}`);
  lines.push(`  pending: ${pending.length}   stale: ${stale.length}   resolved: ${resolved.length}`);

  if (blocking.length === 0) {
    lines.push('');
    lines.push(`✓ clean — no drift at severity "${opts.severity}".`);
    lines.push('');
    return { text: lines.join('\n'), exit: 0 };
  }

  lines.push('');
  lines.push(`✗ ${blocking.length} spec(s) bloqueando:`);
  for (const e of blocking) {
    lines.push(`  - ${e.spec}  [${e.status}]  ${e.action || ''}`.trimEnd());
  }
  lines.push('');
  lines.push('Hint: rode `/aegis-keeper after` para resolver, ou ajuste severity para `low`/`medium`.');
  lines.push('');
  return { text: lines.join('\n'), exit: opts.severity === 'low' ? 0 : 1 };
}

function reportJson(driftPath, summary, opts, blastBySpec) {
  const { pending, stale, resolved, blocking } = summary;
  const payload = {
    severity: opts.severity,
    source: driftPath,
    counts: { pending: pending.length, stale: stale.length, resolved: resolved.length },
    blocking: blocking.map((e) => ({
      spec: e.spec,
      status: e.status,
      action: e.action,
      affected_files: blastBySpec?.[e.spec] ?? null,
    })),
    clean: blocking.length === 0,
  };
  return {
    text: JSON.stringify(payload, null, 2),
    exit: blocking.length === 0 ? 0 : (opts.severity === 'low' ? 0 : 1),
  };
}

// Map spec → list of files transitively affected by edits to those files,
// using the L0 graph + code-spec-matrix. Returns null per spec if either
// data source is missing or empty (drift-check stays usable in either case).
function computeBlastRadius(projectRoot, specs) {
  const graphPath = join(projectRoot, '.aegis', 'context', 'graph.json');
  if (!existsSync(graphPath)) return null;
  let graph;
  try { graph = JSON.parse(readFileSync(graphPath, 'utf8')); }
  catch { return null; }

  const matrixPath = findMatrix(projectRoot);
  if (!matrixPath) return null;
  const specToFiles = parseMatrix(readFileSync(matrixPath, 'utf8'));

  // Build reverse-edge map once.
  const reverse = new Map();
  for (const e of graph.edges ?? []) {
    if (e.kind !== 'imports') continue;
    if (!reverse.has(e.to)) reverse.set(e.to, []);
    reverse.get(e.to).push(e.from);
  }

  const result = {};
  for (const spec of specs) {
    const files = specToFiles[spec] ?? [];
    if (files.length === 0) { result[spec] = []; continue; }
    const visited = new Set(files);
    const queue = [...files];
    while (queue.length) {
      const node = queue.shift();
      for (const dep of reverse.get(node) ?? []) {
        if (visited.has(dep)) continue;
        visited.add(dep);
        queue.push(dep);
      }
    }
    for (const f of files) visited.delete(f);
    const affected = Array.from(visited).slice(0, 20);
    if (visited.size > 20) affected.push(`+${visited.size - 20} more`);
    result[spec] = affected;
  }
  return result;
}

function findMatrix(projectRoot) {
  const candidates = [
    join(projectRoot, 'aegis', 'traceability', 'code-spec-matrix.md'),
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  return null;
}

function parseMatrix(content) {
  // Heuristic: rows like `| \`src/path.js\` | \`spec/foo.md\` | …`. We tolerate
  // table headers and free-form prose between rows.
  const out = {};
  for (const line of content.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').map((s) => s.trim()).filter(Boolean);
    if (cells.length < 2) continue;
    const fileMatch = cells[0].match(/`([^`]+)`/);
    const specMatch = cells[1].match(/`([^`]+)`/);
    if (!fileMatch || !specMatch) continue;
    const file = fileMatch[1];
    const spec = specMatch[1];
    if (!out[spec]) out[spec] = [];
    if (!out[spec].includes(file)) out[spec].push(file);
  }
  return out;
}

export default async function driftCheck(args) {
  const opts = parseArgs(args);
  const projectRoot = resolve(process.cwd());
  const outputFolder = detectOutputFolder(projectRoot, opts.folder);
  const driftPath = join(projectRoot, outputFolder, 'drift.md');

  if (!existsSync(driftPath)) {
    if (opts.format === 'json') {
      process.stdout.write(JSON.stringify({
        error: 'drift.md not found',
        path: driftPath,
        hint: 'Run `/aegis` to initialize, then `/aegis-keeper after` to populate drift.md',
      }, null, 2) + '\n');
    } else {
      process.stderr.write(`\naegis drift-check: drift.md not found at ${driftPath}\n`);
      process.stderr.write(`Hint: rode \`/aegis\` no projeto, depois \`/aegis-keeper after\` para popular drift.md.\n\n`);
    }
    process.exit(2);
  }

  const content = readFileSync(driftPath, 'utf8');
  const entries = parseDriftMd(content);
  const summary = classify(entries, opts.severity);

  let blastBySpec = null;
  if (opts.format === 'json' && summary.blocking.length > 0) {
    blastBySpec = computeBlastRadius(projectRoot, summary.blocking.map((e) => e.spec));
  }

  const report = opts.format === 'json'
    ? reportJson(driftPath, summary, opts, blastBySpec)
    : reportText(driftPath, summary, opts);

  const stream = report.exit === 0 ? process.stdout : process.stderr;
  stream.write(report.text + '\n');
  process.exit(report.exit);
}

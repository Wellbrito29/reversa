// `aegis coverage [--format json]`
//
// Reports keeper coverage metrics:
//   - % source files with entry in code-spec-matrix.md
//   - % specs with last_synced within last 30 days
//
// Helps measure how well specs track reality.

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

function parseArgs(args) {
  return { format: args.includes('--format=json') || args.includes('--json') ? 'json' : 'text' };
}

function parseMatrix(content) {
  const map = new Map();
  for (const line of content.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').map((s) => s.trim()).filter(Boolean);
    if (cells.length < 2) continue;
    const fileMatch = cells[0].match(/`([^`]+)`/);
    const specMatch = cells[1].match(/`([^`]+)`/);
    if (fileMatch && specMatch) map.set(fileMatch[1], specMatch[1]);
  }
  return map;
}

function countSourceFiles(root) {
  // Heuristic: find common source extensions, exclude node_modules/dist/build
  const { execSync } = require('child_process');
  try {
    const out = execSync(
      'find . -type f \\( -name "*.js" -o -name "*.ts" -o -name "*.tsx" -o -name "*.jsx" -o -name "*.py" -o -name "*.go" -o -name "*.rs" \\) | grep -vE "node_modules|dist|build|coverage|aegis" | wc -l',
      { cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] },
    );
    return parseInt(out.trim(), 10);
  } catch {
    return 0;
  }
}

function parseSpecFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]+?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    const [k, ...v] = line.split(':');
    if (k && v.length) fm[k.trim()] = v.join(':').trim();
  }
  return fm;
}

function checkLastSynced(root, specPath) {
  const abs = join(root, specPath);
  if (!existsSync(abs)) return false;
  const content = readFileSync(abs, 'utf8');
  const fm = parseSpecFrontmatter(content);
  if (!fm.last_synced) return false;
  const ts = new Date(fm.last_synced).getTime();
  const now = Date.now();
  const days = (now - ts) / (1000 * 60 * 60 * 24);
  return days <= 30;
}

export default function coverage(args) {
  const opts = parseArgs(args);
  const root = resolve(process.cwd());

  const matrixPath = join(root, 'aegis', 'traceability', 'code-spec-matrix.md');
  if (!existsSync(matrixPath)) {
    const err = { error: 'code-spec-matrix.md not found', path: matrixPath };
    if (opts.format === 'json') {
      console.log(JSON.stringify(err, null, 2));
    } else {
      console.error('Error: code-spec-matrix.md not found');
      console.error(`Expected at: ${matrixPath}`);
    }
    process.exit(1);
  }

  const matrix = parseMatrix(readFileSync(matrixPath, 'utf8'));
  const totalSources = countSourceFiles(root);
  const coveredSources = matrix.size;
  const coveragePercent = totalSources > 0 ? (coveredSources / totalSources) * 100 : 0;

  const specs = new Set(matrix.values());
  const recentSpecs = Array.from(specs).filter((s) => checkLastSynced(root, s)).length;
  const freshnessPercent = specs.size > 0 ? (recentSpecs / specs.size) * 100 : 0;

  const result = {
    total_sources: totalSources,
    covered_sources: coveredSources,
    coverage_percent: Math.round(coveragePercent),
    total_specs: specs.size,
    recent_specs: recentSpecs,
    freshness_percent: Math.round(freshnessPercent),
  };

  if (opts.format === 'json') {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Source file coverage: ${coveredSources}/${totalSources} (${result.coverage_percent}%)`);
    console.log(`Spec freshness (<30d): ${recentSpecs}/${specs.size} (${result.freshness_percent}%)`);
  }
}

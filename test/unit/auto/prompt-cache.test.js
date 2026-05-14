import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSystemBlocks, buildUserMessage } from '../../../lib/auto/prompt-cache.js';

test('buildSystemBlocks: with specContext yields two blocks, breakpoint on second', () => {
  const blocks = buildSystemBlocks('# spec body');
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].type, 'text');
  assert.equal(blocks[0].cache_control, undefined);
  assert.equal(blocks[1].type, 'text');
  assert.deepEqual(blocks[1].cache_control, { type: 'ephemeral' });
  assert.match(blocks[1].text, /Spec context/);
  assert.match(blocks[1].text, /# spec body/);
});

test('buildSystemBlocks: without specContext puts breakpoint on the single block', () => {
  const blocks = buildSystemBlocks(null);
  assert.equal(blocks.length, 1);
  assert.deepEqual(blocks[0].cache_control, { type: 'ephemeral' });
});

test('buildSystemBlocks: omits specContext when empty string', () => {
  const blocks = buildSystemBlocks('');
  assert.equal(blocks.length, 1);
});

test('buildSystemBlocks: stable prefix mentions JSON-only output', () => {
  const blocks = buildSystemBlocks('x');
  assert.match(blocks[0].text, /JSON object/);
  assert.match(blocks[0].text, /no prose/);
});

test('buildUserMessage: includes file and diff when no extras provided', () => {
  const msg = buildUserMessage({ file: 'src/x.js', diff: '+ new line' });
  assert.match(msg, /^File: src\/x\.js/);
  assert.match(msg, /Diff:\n\+ new line/);
});

test('buildUserMessage: includes commit message first line only', () => {
  const msg = buildUserMessage({
    file: 'a.js',
    diff: 'd',
    commitMessage: 'fix: bug\n\nlonger body',
  });
  assert.match(msg, /Commit: fix: bug\b/);
  assert.doesNotMatch(msg, /longer body/);
});

test('buildUserMessage: includes graph context when provided', () => {
  const msg = buildUserMessage({
    file: 'a.js',
    diff: 'd',
    graphContext: '- imported by foo.js',
  });
  assert.match(msg, /Graph context:\n- imported by foo\.js/);
});

test('buildUserMessage: skips falsy fields', () => {
  const msg = buildUserMessage({ file: 'a.js', diff: 'd', commitMessage: '', graphContext: null });
  assert.doesNotMatch(msg, /Commit:/);
  assert.doesNotMatch(msg, /Graph context:/);
});

test('buildUserMessage: separates parts with blank lines', () => {
  const msg = buildUserMessage({
    file: 'a.js',
    commitMessage: 'fix',
    graphContext: 'g',
    diff: 'd',
  });
  const parts = msg.split('\n\n');
  assert.equal(parts.length, 4);
});

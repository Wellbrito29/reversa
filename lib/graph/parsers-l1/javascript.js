// L1 JavaScript parser — wraps @babel/parser with JS-friendly plugins.
// Returns the raw AST. Extractors consume it.

import { parse } from '@babel/parser';

const PLUGINS = [
  'jsx',
  'classProperties',
  'classPrivateProperties',
  'classPrivateMethods',
  'decorators-legacy',
  'objectRestSpread',
  'optionalChaining',
  'nullishCoalescingOperator',
  'topLevelAwait',
  'importMeta',
  'dynamicImport',
];

export function parseAst(source, { filename } = {}) {
  return parse(source, {
    sourceType: 'module',
    sourceFilename: filename,
    allowImportExportEverywhere: true,
    allowReturnOutsideFunction: true,
    errorRecovery: true,
    plugins: PLUGINS,
  });
}

export const language = 'javascript';
export const extensions = ['.js', '.jsx', '.mjs', '.cjs'];

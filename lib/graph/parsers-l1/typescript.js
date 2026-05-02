// L1 TypeScript parser — same as JS plus typescript plugin (covers TSX too).

import { parse } from '@babel/parser';

const PLUGINS = [
  'typescript',
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

export const language = 'typescript';
export const extensions = ['.ts', '.tsx', '.mts', '.cts'];

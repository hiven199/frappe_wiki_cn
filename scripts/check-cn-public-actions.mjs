import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const relativePath = 'wiki/templates/wiki/macros/buttons.html';
const source = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const failures = [];

function requirePattern(pattern, description) {
  if (!pattern.test(source)) failures.push(`${relativePath}: missing ${description}`);
}

function forbidPattern(pattern, description) {
  if (pattern.test(source)) failures.push(`${relativePath}: ${description}`);
}

requirePattern(/_\(["']More page actions["']\)/, 'localized page-actions aria label');
requirePattern(/_\(["']Download this page as a PDF["']\)/, 'localized PDF download description');
requirePattern(/_\(["']Preparing…["']\)/, 'localized download preparing state');
requirePattern(/_\(["']Download["']\)/, 'localized download action');
requirePattern(/_\(["']Copied!["']\)/, 'localized copied state');
requirePattern(/_\(["']Copy["']\)/, 'localized copy action');

forbidPattern(/x-text="downloadInProgress \? ['"]Preparing…['"] : ['"]Download['"]"/, 'raw download state bypasses i18n');
forbidPattern(/>\s*Download this page as a PDF\s*</, 'raw PDF download description bypasses i18n');
forbidPattern(/x-text="copied \? ['"]Copied!['"] : ['"]Copy['"]"/, 'raw copy state bypasses i18n');
forbidPattern(/aria-label=["']More page actions["']/, 'raw page-actions aria label bypasses i18n');

if (failures.length) {
  console.error('CN_PUBLIC_ACTIONS_GATE: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('CN_PUBLIC_ACTIONS_GATE: PASS');

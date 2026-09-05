import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const installPath = path.join(repoRoot, 'wiki/install.py');
const install = fs.readFileSync(installPath, 'utf8');
const failures = [];

function requirePattern(pattern, description) {
  if (!pattern.test(install)) failures.push(`wiki/install.py: missing ${description}`);
}

function forbidPattern(pattern, description) {
  if (pattern.test(install)) failures.push(`wiki/install.py: ${description}`);
}

requirePattern(/space\.home_tab_title\s*=\s*["']首页["']/, 'Chinese Home seed');
requirePattern(/page\.title\s*=\s*["']欢迎使用 Wiki["']/, 'Chinese starter title');
requirePattern(/page\.content\s*=\s*["']# 欢迎使用 Wiki！["']/, 'Chinese starter content');

forbidPattern(/page\.title\s*=\s*["']Welcome to Frappe Wiki["']/, 'upstream English starter title must not return');
forbidPattern(/page\.content\s*=\s*["']# Welcome to Frappe Wiki!["']/, 'upstream English starter content must not return');
forbidPattern(/page\.title\s*=\s*["']欢迎使用 Frappe Wiki["']/, 'Frappe-prefixed CN starter title must not return');
forbidPattern(/page\.content\s*=\s*["']# 欢迎使用 Frappe Wiki！["']/, 'Frappe-prefixed CN starter content must not return');
forbidPattern(/space\.home_tab_title\s*=\s*["']Home["']/, 'upstream English Home seed must not return');

if (failures.length) {
  console.error('CN_SEED_GATE: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('CN_SEED_GATE: PASS');

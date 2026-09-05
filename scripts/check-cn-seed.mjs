import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const installPath = path.join(repoRoot, 'wiki/install.py');
const frontendIndexPath = path.join(repoRoot, 'frontend/index.html');
const install = fs.readFileSync(installPath, 'utf8');
const frontendIndex = fs.readFileSync(frontendIndexPath, 'utf8');
const failures = [];

function requirePattern(text, source, pattern, description) {
  if (!pattern.test(text)) failures.push(`${source}: missing ${description}`);
}

function forbidPattern(text, source, pattern, description) {
  if (pattern.test(text)) failures.push(`${source}: ${description}`);
}

requirePattern(install, 'wiki/install.py', /space\.home_tab_title\s*=\s*["']首页["']/, 'Chinese Home seed');
requirePattern(install, 'wiki/install.py', /page\.title\s*=\s*["']欢迎使用 Wiki["']/, 'Chinese starter title');
requirePattern(install, 'wiki/install.py', /page\.content\s*=\s*["']# 欢迎使用 Wiki！["']/, 'Chinese starter content');
requirePattern(frontendIndex, 'frontend/index.html', /<html lang="zh-CN">/, 'zh-CN document language');
requirePattern(frontendIndex, 'frontend/index.html', /<title>Wiki<\/title>/, 'Wiki product title');

forbidPattern(install, 'wiki/install.py', /page\.title\s*=\s*["']Welcome to Frappe Wiki["']/, 'upstream English starter title must not return');
forbidPattern(install, 'wiki/install.py', /page\.content\s*=\s*["']# Welcome to Frappe Wiki!["']/, 'upstream English starter content must not return');
forbidPattern(install, 'wiki/install.py', /page\.title\s*=\s*["']欢迎使用 Frappe Wiki["']/, 'Frappe-prefixed CN starter title must not return');
forbidPattern(install, 'wiki/install.py', /page\.content\s*=\s*["']# 欢迎使用 Frappe Wiki！["']/, 'Frappe-prefixed CN starter content must not return');
forbidPattern(install, 'wiki/install.py', /space\.home_tab_title\s*=\s*["']Home["']/, 'upstream English Home seed must not return');
forbidPattern(frontendIndex, 'frontend/index.html', /Frappe Wiki/, 'visible Frappe Wiki product branding must not return');

if (failures.length) {
  console.error('CN_SEED_GATE: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('CN_SEED_GATE: PASS');

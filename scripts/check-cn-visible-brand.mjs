import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targets = [
	'frontend/src',
	'frontend/index.html',
	'wiki/templates',
	'wiki/www',
	'wiki/install.py',
];
const forbidden = ['Frappe Wiki', '欢迎使用 Frappe Wiki'];
const failures = [];

function scan(relativePath) {
	const absolutePath = path.join(repoRoot, relativePath);
	if (!fs.existsSync(absolutePath)) return;

	const stat = fs.statSync(absolutePath);
	if (stat.isDirectory()) {
		for (const name of fs.readdirSync(absolutePath)) {
			if (name.endsWith('.map')) continue;
			scan(path.join(relativePath, name));
		}
		return;
	}

	if (!stat.isFile() || relativePath.endsWith('.map')) return;
	const lines = fs.readFileSync(absolutePath, 'utf8').split(/\r?\n/);
	for (let index = 0; index < lines.length; index += 1) {
		for (const token of forbidden) {
			if (lines[index].includes(token)) {
				failures.push(`${relativePath}:${index + 1}: ${token}`);
			}
		}
	}
}

for (const target of targets) scan(target);

if (failures.length) {
	console.error('CN_VISIBLE_BRAND_GATE: FAIL');
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}

console.log('CN_VISIBLE_BRAND_GATE: PASS');

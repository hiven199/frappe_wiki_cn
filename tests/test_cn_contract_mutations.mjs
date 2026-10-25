import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gate = path.join(root, 'scripts/check-cn-i18n-foundation.mjs');
const files = execFileSync('git', ['ls-files', '-z'], { cwd: root }).toString().split('\0').filter(Boolean);
const cases = [
  ['unguarded library sidebar', 'frontend/src/layouts/MainLayout.vue', 'v-else-if="isRouteReady"', 'v-else'],
  ['untranslated updated timestamp', 'wiki/templates/wiki/document.html', '_("Last updated {0}").format(last_updated)', '"Last updated " + last_updated'],
  ['unescaped public TOC', 'wiki/templates/wiki/includes/toc.html', '_("On this page") | e', '_("On this page")'],
  ['unencoded JS timestamp label', 'wiki/templates/wiki/includes/sidebar.html', '_("Last updated {0}") | tojson', '_("Last updated {0}")'],
  ['unescaped SPA TOC', 'wiki/templates/wiki/includes/sidebar.html', 'escapeHtml({{ _("On this page") | tojson }})', '{{ _("On this page") | tojson }}'],
];

test('current translated and escaped production contracts pass', () => {
  assert.equal(spawnSync(process.execPath, [gate], { encoding: 'utf8' }).status, 0);
});

for (const [name, file, before, after] of cases) {
  test(`regression remains rejected: ${name}`, () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-cn-contract-'));
    try {
      // Copy only the source files inspected by the existing gate. No Bench or Site.
      const gateText = fs.readFileSync(gate, 'utf8');
      for (const relative of files) {
        if (!gateText.includes(`'${relative}'`)) continue;
        const target = path.join(temp, relative);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(path.join(root, relative), target);
      }
      const target = path.join(temp, file);
      const original = fs.readFileSync(target, 'utf8');
      assert.ok(original.includes(before), `mutation must match actual source: ${file}`);
      fs.writeFileSync(target, original.replace(before, after));
      const result = spawnSync(process.execPath, [gate, '--root', temp], { encoding: 'utf8' });
      assert.equal(result.status, 1, result.stderr);
      assert.ok(result.stderr.includes(`${file}: missing`), result.stderr);
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });
}

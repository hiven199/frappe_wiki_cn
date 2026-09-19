import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function read(relativePath) {
	return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function requireText(relativePath, text, description) {
	if (!read(relativePath).includes(text)) {
		failures.push(`${relativePath}: missing ${description}`);
	}
}

function forbidText(relativePath, text, description) {
	if (read(relativePath).includes(text)) {
		failures.push(`${relativePath}: ${description}`);
	}
}

function requireCount(relativePath, text, expected, description) {
	const source = read(relativePath);
	const count = source.split(text).length - 1;
	if (count !== expected) {
		failures.push(`${relativePath}: ${description}; expected ${expected}, got ${count}`);
	}
}

// Wiki 3.2.1 exact source family.
requireText('wiki/__init__.py', '__version__ = "3.2.1"', 'Wiki 3.2.1 version marker');

// Role capability: localized display, canonical Role.name storage.
requireText(
	'wiki/api/wiki_space.py',
	'def search_roles(',
	'server-side role search capability',
);
requireText(
	'wiki/api/wiki_space.py',
	'space.check_permission("write")',
	'write permission guard for role search/update',
);
requireText(
	'wiki/api/wiki_space.py',
	'"value": role_name, "label": label',
	'canonical role value with localized display label',
);
requireText(
	'frontend/src/components/SpaceSettings/AccessPanel.vue',
	"url: 'wiki.api.wiki_space.search_roles'",
	'remote role search provider',
);
requireText(
	'frontend/src/components/SpaceSettings/AccessPanel.vue',
	'{{ __(row.role) }}',
	'localized role display without mutating canonical storage',
);
requireText(
	'frontend/src/components/SpaceSettings/AccessPanel.vue',
	"roleRows.value.push({ role, permission_level: 'Read' })",
	'canonical role selection stored in access rows',
);

// Search capability: version-16 cannot use the develop-only SQLite queue API.
requireText(
	'wiki/frappe_wiki/doctype/wiki_document/wiki_sqlite_search.py',
	'def reindex_docs(',
	'Wiki-owned search reindex worker',
);
requireText(
	'wiki/frappe_wiki/doctype/wiki_document/wiki_sqlite_search.py',
	'enqueue_after_commit=True',
	'after-commit search reindex scheduling',
);
requireText(
	'wiki/frappe_wiki/doctype/wiki_document/wiki_sqlite_search.py',
	'search.index_doc("Wiki Document", docname)',
	'Frappe v16 compatible index_doc call',
);
requireText(
	'wiki/frappe_wiki/doctype/wiki_document/test_wiki_sqlite_search_compat.py',
	'from wiki.frappe_wiki.doctype.wiki_document.wiki_sqlite_search import enqueue_reindex, reindex_docs',
	'search compatibility regression test binding',
);

// Git Sync capability: persisted canonical status values are localized only at display time.
for (const label of ['Sync succeeded', 'Sync failed', 'Sync in progress', 'No changes']) {
	requireText(
		'frontend/src/components/SpaceSettings/GitSyncPanel.vue',
		`__('${label}')`,
		`localized Git Sync status: ${label}`,
	);
}
requireText(
	'frontend/src/components/SpaceSettings/GitSyncPanel.vue',
	'function firstLine(text)',
	'Git Sync exception-display normalization',
);

// Editor capability: retain official 3.2.1 editor surfaces while keeping CN bootstrap and read-only seams.
for (const token of [
	'EditorTableMenu',
	'WikiBubbleMenu',
	'WikiToolbar',
	"from 'frappe-ui/editor'",
	"upload_endpoint: '/api/method/wiki.api.upload_wiki_asset'",
	'readonly:',
]) {
	requireText('frontend/src/components/WikiEditor.vue', token, `Wiki 3.2.1 editor seam ${token}`);
}

// The SPA bootstrap must preload translations exactly once before mounting.
requireText('frontend/src/main.js', 'await loadTranslations();', 'translation preload before mount');
requireText('frontend/src/main.js', 'const app = createApp(App);', 'Vue app construction inside bootstrap');
requireText('frontend/src/main.js', 'app.use(pageMetaPlugin);', 'page metadata plugin retained');
requireCount('frontend/src/main.js', 'app.use(pinia);', 1, 'Pinia plugin must be registered once');
requireCount('frontend/src/main.js', 'app.use(router);', 1, 'router plugin must be registered once');
requireCount(
	'frontend/src/main.js',
	'app.use(translationPlugin);',
	1,
	'translation plugin must be registered once',
);
requireCount(
	'frontend/src/main.js',
	'app.use(resourcesPlugin);',
	1,
	'resources plugin must be registered once',
);

// Image/viewer capability: keep the reader zoom/pan/pinch contract and Mermaid SVG support.
for (const token of [
	'id="image-viewer-stage"',
	'id="image-viewer-toolbar"',
	'id="image-viewer-zoom"',
]) {
	requireText('wiki/templates/wiki/layout.html', token, `reader image viewer seam ${token}`);
}
for (const token of [
	'fitToScreen',
	'actualSize',
	'zoomTo',
	'pointerDistance',
	'pointerMidpoint',
	'#wiki-content .mermaid[data-processed] svg',
	'openSvg',
]) {
	requireText('wiki/public/js/image-viewer.js', token, `image viewer capability ${token}`);
}
forbidText(
	'wiki/public/js/image-viewer.js',
	'addEventListener("touchmove"',
	'legacy touchmove close behavior must stay removed',
);

// CN visible-brand capability remains part of the app-specific static gate.
requireText(
	'package.json',
	'node scripts/check-cn-visible-brand.mjs',
	'CN visible-brand static gate registration',
);

if (failures.length) {
	console.error('WIKI_V321_CAPABILITY_CONTRACT: FAIL');
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}

console.log('WIKI_V321_CAPABILITY_CONTRACT: PASS');

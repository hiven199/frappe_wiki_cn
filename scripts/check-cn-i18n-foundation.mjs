import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function read(relativePath) {
	return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function requireMatch(relativePath, pattern, description) {
	const content = read(relativePath);
	if (!pattern.test(content)) {
		failures.push(`${relativePath}: missing ${description}`);
	}
}

function forbidMatch(relativePath, pattern, description) {
	const content = read(relativePath);
	if (pattern.test(content)) {
		failures.push(`${relativePath}: ${description}`);
	}
}

requireMatch(
	'frontend/src/main.js',
	/await\s+loadTranslations\(\)/,
	'translation preload before Vue mount',
);
requireMatch(
	'frontend/src/translation.js',
	/export\s+async\s+function\s+loadTranslations/,
	'awaitable translation loader',
);
forbidMatch(
	'frontend/src/translation.js',
	/createResource\([\s\S]*?wiki\.api\.get_translations/,
	'legacy fire-and-forget translation resource is not allowed',
);
requireMatch(
	'frontend/src/components/Sidebar.vue',
	/const\s+navItems\s*=\s*computed\(\(\)\s*=>/,
	'translation-aware sidebar navigation',
);
forbidMatch(
	'frontend/src/components/tiptap-extensions/WikiToolbar.vue',
	/label:\s*['"](?:Task List|Code Block|Insert Image|Insert PDF|Insert Video|Heading)['"]/,
	'raw editor toolbar label bypasses i18n',
);
forbidMatch(
	'frontend/src/components/tiptap-extensions/WikiBubbleMenu.vue',
	/label:\s*['"]Code Block['"]/,
	'raw bubble-menu label bypasses i18n',
);
requireMatch(
	'frontend/src/components/tiptap-extensions/slash-commands.js',
	/get\s+title\(\)\s*\{[\s\S]*?translate\(title\)/,
	'lazy localized slash-command titles',
);
requireMatch(
	'frontend/src/components/tiptap-extensions/slash-commands.js',
	/get\s+group\(\)\s*\{[\s\S]*?translate\(group\)/,
	'lazy localized slash-command groups',
);
forbidMatch(
	'frontend/src/components/tiptap-extensions/SlashCommandsList.vue',
	/>\s*No commands found\s*</,
	'raw slash-command empty state bypasses i18n',
);
forbidMatch(
	'frontend/src/components/tiptap-extensions/LinkPopup.vue',
	/title=['"](?:Submit|Cancel|Copy|Edit|Remove)['"]/,
	'raw link-popup tooltip bypasses i18n',
);
forbidMatch(
	'frontend/src/components/tiptap-extensions/LinkPopup.vue',
	/toast\.(?:success|error)\(['"](?:Link copied|Failed to copy)['"]\)/,
	'raw link-popup toast bypasses i18n',
);
requireMatch(
	'frontend/src/components/IconGrid.vue',
	/:title=['"]__\(icon\.label\)['"]/,
	'localized icon-picker labels',
);
requireMatch(
	'wiki/api/__init__.py',
	/def\s+_get_effective_language\(\)\s*->\s*str:/,
	'User.language → System Settings language fallback',
);
requireMatch(
	'wiki/patches.txt',
	/wiki\.wiki\.doctype\.wiki_space\.patches\.cn_localize_default_seed/,
	'CN starter-content migration patch registration',
);

if (failures.length) {
	console.error('CN_I18N_FOUNDATION_GATE: FAIL');
	for (const failure of failures) {
		console.error(`- ${failure}`);
	}
	process.exit(1);
}

console.log('CN_I18N_FOUNDATION_GATE: PASS');

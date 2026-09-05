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
requireMatch(
	'frontend/src/components/Sidebar.vue',
	/__\(['"]Expand['"]\)[\s\S]*?__\(['"]Collapse['"]\)|__\(['"]Collapse['"]\)[\s\S]*?__\(['"]Expand['"]\)/,
	'localized sidebar collapse/expand control',
);
forbidMatch(
	'frontend/src/components/Sidebar.vue',
	/SidebarCollapseToggle/,
	'frappe-ui SidebarCollapseToggle hard-codes Collapse/Expand',
);
requireMatch(
	'frontend/src/components/SpaceSettings/PermissionsPanel.vue',
	/label:\s*__\(['"]Read['"]\),\s*value:\s*['"]Read['"]/,
	'localized permission label preserving canonical Read value',
);
requireMatch(
	'frontend/src/components/SpaceSettings/PermissionsPanel.vue',
	/label:\s*__\(['"]Write['"]\),\s*value:\s*['"]Write['"]/,
	'localized permission label preserving canonical Write value',
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
requireMatch(
	'frontend/src/components/tiptap-extensions/SlashCommandsList.vue',
	/import\s+\{\s*translate\s+as\s+t\s*\}/,
	'standalone slash popup translator import',
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
forbidMatch(
	'frontend/src/components/WikiEditor.vue',
	/toast\.(?:success|error)\(\s*['"](?:Failed to upload file|Editor is not ready|Could not get content from editor)['"]/,
	'raw WikiEditor toast bypasses i18n',
);
forbidMatch(
	'frontend/src/components/WikiEditor.vue',
	/error:\s*error\?\.message\s*\|\|\s*['"](?:Failed to upload image|Failed to upload PDF)['"]/,
	'raw WikiEditor upload error bypasses i18n',
);
forbidMatch(
	'frontend/src/components/WikiEditor.vue',
	/placeholder:\s*['"]Type \\"\/\\" for commands, or start writing\.\.\.['"]/,
	'raw WikiEditor placeholder bypasses i18n',
);

const visibleStringChecks = [
	[
		'frontend/src/components/tiptap-extensions/ImageNodeView.vue',
		/(?:>\s*Uploading…\s*<|placeholder=['"]Add caption\.\.\.|>\s*Upload failed:)/,
		'raw image-node status text bypasses i18n',
	],
	[
		'frontend/src/components/tiptap-extensions/IframeBlockView.vue',
		/(?:>\s*Paste a URL or <iframe> embed code\.\s*<|>\s*Embed\s*<|>\s*Remove\s*<)/,
		'raw iframe-block controls bypasses i18n',
	],
	[
		'frontend/src/components/tiptap-extensions/PdfBlockView.vue',
		/(?:title=['"](?:Remove|Open viewer|Download)['"]|>\s*Uploading…\s*<|>\s*Preview unavailable\s*<)/,
		'raw PDF-block UI bypasses i18n',
	],
	[
		'frontend/src/components/tiptap-extensions/PdfViewerModal.vue',
		/title=['"](?:Zoom out|Zoom in|Download|Close \(Esc\))['"]/,
		'raw PDF-viewer tooltip bypasses i18n',
	],
	[
		'frontend/src/components/tiptap-extensions/VideoBlockView.vue',
		/(?:>\s*Video\s*<|Your browser does not support the video tag\.(?!['"]\)\s*\}\}))/,
		'raw video-block fallback text bypasses i18n',
	],
	[
		'frontend/src/components/tiptap-extensions/CalloutBlockView.vue',
		/(?:label:\s*['"](?:Edit Title|Delete|Note|Tip|Caution|Danger)['"]|title=['"](?:Bold \(Ctrl\+B\)|Italic \(Ctrl\+I\)|Link|Apply|Cancel)['"]|>\s*Double-click to edit\.\.\.\s*<)/,
		'raw callout editor UI bypasses i18n',
	],
	[
		'frontend/src/components/tiptap-extensions/MermaidBlockView.vue',
		/(?:>\s*Rendering…\s*<|>\s*Mermaid diagram\s*<|title=['"](?:Learn about Mermaid|Remove diagram)['"]|>\s*Start typing Mermaid to preview your diagram\.\s*<)/,
		'raw Mermaid editor UI bypasses i18n',
	],
];
for (const [file, pattern, description] of visibleStringChecks) {
	forbidMatch(file, pattern, description);
}

requireMatch(
	'wiki/templates/wiki/includes/header.html',
	/\{\{\s*_\(['"]Search documentation['"]\)\s*\}\}/,
	'localized public search trigger',
);
forbidMatch(
	'wiki/templates/wiki/includes/header.html',
	/>\s*Search documentation\s*</,
	'raw public search label bypasses i18n',
);
requireMatch(
	'wiki/templates/wiki/document.html',
	/page_actions_dropdown\([\s\S]*?edit_text=_\(["']Edit["']\)/,
	'localized public Edit action',
);
requireMatch(
	'wiki/templates/wiki/document.html',
	/\{\{\s*_\(['"]Last updated['"]\)\s*\}\}/,
	'localized public Last updated label',
);
forbidMatch(
	'wiki/templates/wiki/document.html',
	/>\s*Last updated\s+\{\{/,
	'raw public Last updated label bypasses i18n',
);
requireMatch(
	'wiki/templates/wiki/includes/feedback_widget.html',
	/\{\{\s*_\(['"]Was this helpful\?['"]\)\s*\}\}/,
	'localized public feedback prompt',
);
forbidMatch(
	'wiki/templates/wiki/includes/feedback_widget.html',
	/>\s*(?:Was this helpful\?|Submit|Thanks!)\s*</,
	'raw public feedback UI bypasses i18n',
);
requireMatch(
	'wiki/templates/wiki/includes/toc.html',
	/\{\{\s*_\(['"]On this page['"]\)\s*\}\}/,
	'localized public table-of-contents label',
);
requireMatch(
	'wiki/templates/wiki/includes/sidebar.html',
	/const\s+lastUpdatedLabel\s*=\s*\{\{\s*_\(['"]Last updated['"]\)/,
	'localized SPA-navigation Last updated label',
);
requireMatch(
	'wiki/templates/wiki/includes/sidebar.html',
	/const\s+onThisPageLabel\s*=\s*\{\{\s*_\(['"]On this page['"]\)/,
	'localized SPA-navigation TOC label',
);

requireMatch(
	'wiki/api/__init__.py',
	/def\s+_get_effective_language\(\)\s*->\s*str:/,
	'User.language → System Settings language fallback',
);
requireMatch(
	'wiki/patches.txt',
	/wiki\.wiki\.doctype\.wiki_space\.patches\.cn_localize_default_seed(?:\s|$)/,
	'CN starter-content migration patch registration',
);
requireMatch(
	'wiki/patches.txt',
	/wiki\.wiki\.doctype\.wiki_space\.patches\.cn_localize_default_seed_drafts/,
	'CN starter-draft migration patch registration',
);
requireMatch(
	'wiki/wiki/doctype/wiki_space/patches/cn_localize_default_seed_drafts.py',
	/status":\s*"Draft"[\s\S]*?DEFAULT_PAGE_TITLE[\s\S]*?DEFAULT_PAGE_CONTENT/,
	'conservative untouched starter-draft guard',
);
requireMatch(
	'wiki/wiki/doctype/wiki_space/wiki_space.json',
	/"default":\s*"首页"[\s\S]*?"fieldname":\s*"home_tab_title"/,
	'Chinese Home label default for new spaces',
);

if (failures.length) {
	console.error('CN_I18N_FOUNDATION_GATE: FAIL');
	for (const failure of failures) {
		console.error(`- ${failure}`);
	}
	process.exit(1);
}

console.log('CN_I18N_FOUNDATION_GATE: PASS');

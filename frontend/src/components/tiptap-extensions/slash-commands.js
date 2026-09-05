/**
 * TipTap Slash Commands Extension
 *
 * Provides "/" command menu for inserting elements.
 * Limited to Markdown-supported features.
 *
 * Items follow frappe-ui's CommandItem shape ({ title, icon, group, command })
 * so the menu renders like the frappe-ui/Gameplan slash menu: consecutive
 * items with the same `group` render under one section header, and `icon` is
 * a lucide CSS class (frappe-ui icon convention).
 */

import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { translate } from '../../translation';

const RAW_SLASH_COMMANDS = [
	{
		title: 'Heading 1',
		icon: 'lucide-heading-1',
		group: 'Text',
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
		},
	},
	{
		title: 'Heading 2',
		icon: 'lucide-heading-2',
		group: 'Text',
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
		},
	},
	{
		title: 'Heading 3',
		icon: 'lucide-heading-3',
		group: 'Text',
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
		},
	},
	{
		title: 'Blockquote',
		icon: 'lucide-quote',
		group: 'Text',
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).toggleBlockquote().run();
		},
	},
	{
		title: 'Code Block',
		icon: 'lucide-code',
		group: 'Text',
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
		},
	},
	{
		title: 'Bullet List',
		icon: 'lucide-list',
		group: 'Lists',
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).toggleBulletList().run();
		},
	},
	{
		title: 'Numbered List',
		icon: 'lucide-list-ordered',
		group: 'Lists',
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).toggleOrderedList().run();
		},
	},
	{
		title: 'Task List',
		icon: 'lucide-list-checks',
		group: 'Lists',
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).toggleTaskList().run();
		},
	},
	{
		title: 'Image',
		icon: 'lucide-image',
		group: 'Media',
		command: ({ editor, range }) => {
			// Delete the slash command text first
			editor.chain().focus().deleteRange(range).run();
			// Dispatch a custom event that WikiEditor will listen for
			const event = new CustomEvent('wiki-editor-upload-image', {
				bubbles: true,
				detail: { editor },
			});
			document.dispatchEvent(event);
		},
	},
	{
		title: 'Video',
		icon: 'lucide-video',
		group: 'Media',
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).selectAndUploadVideo().run();
		},
	},
	{
		title: 'PDF',
		icon: 'lucide-file-text',
		group: 'Media',
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).selectAndUploadPdf().run();
		},
	},
	{
		title: 'Table',
		icon: 'lucide-table',
		group: 'Insert',
		command: ({ editor, range }) => {
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.insertTable({ rows: 3, cols: 3, withHeaderRow: true })
				.run();
		},
	},
	{
		title: 'Embed',
		icon: 'lucide-app-window',
		group: 'Insert',
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).insertIframePlaceholder().run();
		},
	},
	{
		title: 'Diagram',
		icon: 'lucide-network',
		group: 'Insert',
		// Longtime users still reach for the engine's name.
		keywords: ['mermaid'],
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).setMermaid({}).run();
		},
	},
	{
		title: 'Horizontal Rule',
		icon: 'lucide-minus',
		group: 'Insert',
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).setHorizontalRule().run();
		},
	},
	{
		title: 'Note',
		icon: 'lucide-info',
		group: 'Callouts',
		command: ({ editor, range }) => {
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.insertContent({
					type: 'calloutBlock',
					attrs: { type: 'note', title: '', content: '' },
				})
				.run();
		},
	},
	{
		title: 'Tip',
		icon: 'lucide-lightbulb',
		group: 'Callouts',
		command: ({ editor, range }) => {
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.insertContent({
					type: 'calloutBlock',
					attrs: { type: 'tip', title: '', content: '' },
				})
				.run();
		},
	},
	{
		title: 'Warning',
		icon: 'lucide-triangle-alert',
		group: 'Callouts',
		command: ({ editor, range }) => {
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.insertContent({
					type: 'calloutBlock',
					attrs: {
						type: 'caution',
						title: '',
						content: '',
					},
				})
				.run();
		},
	},
	{
		title: 'Danger',
		icon: 'lucide-octagon-alert',
		group: 'Callouts',
		command: ({ editor, range }) => {
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.insertContent({
					type: 'calloutBlock',
					attrs: {
						type: 'danger',
						title: '',
						content: '',
					},
				})
				.run();
		},
	},
];

function localizeCommand(command) {
	const { title, group, ...rest } = command;
	return {
		...rest,
		titleKey: title,
		groupKey: group,
		get title() {
			return translate(title);
		},
		get group() {
			return translate(group);
		},
	};
}

// Keep translation lazy. This module can be evaluated while the main module
// graph is loading, before the translation dictionary has been preloaded.
// Getters resolve labels only when the slash menu actually reads them.
export const SLASH_COMMANDS = RAW_SLASH_COMMANDS.map(localizeCommand);

/**
 * Filter commands by search query. Match localized labels, their English
 * source keys, and any legacy keywords ("mermaid" → Diagram).
 */
export function filterCommands(query) {
	if (!query) return SLASH_COMMANDS;

	const lowerQuery = query.toLowerCase();
	return SLASH_COMMANDS.filter((cmd) =>
		[
			cmd.title,
			cmd.group,
			cmd.titleKey,
			cmd.groupKey,
			...(cmd.keywords || []),
		].some((text) => text?.toLowerCase().includes(lowerQuery)),
	);
}

/**
 * Slash Commands Extension
 */
export const SlashCommands = Extension.create({
	name: 'slashCommands',

	addOptions() {
		return {
			suggestion: {
				char: '/',
				startOfLine: false,
				command: ({ editor, range, props }) => {
					props.command({ editor, range });
				},
			},
		};
	},

	addProseMirrorPlugins() {
		return [
			Suggestion({
				editor: this.editor,
				...this.options.suggestion,
			}),
		];
	},
});

export default SlashCommands;

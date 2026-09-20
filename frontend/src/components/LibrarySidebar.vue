<template>
	<!-- Level 0 of the drill-in model: the wiki's library. Entering a space
	     replaces this whole column with SpaceSidebar, so this is the only place
	     that lists what a wiki contains.

	     SidebarHeader owns its own gutter and a fixed 48px height that lines up
	     with PageHeader, so it goes straight into Sidebar. Padding belongs on the
	     scroll region and the footer instead. -->
	<Sidebar>
		<SidebarHeader
			:title="__('Wiki')"
			:subtitle="userStore.data?.full_name"
			logo="/assets/wiki/images/wiki-logo.png"
			:menu-items="headerMenuItems"
		/>
		<ScrollArea class="min-h-0 flex-1" viewport-class="px-2 pt-1">
			<div class="flex flex-col gap-0.5">
				<SidebarItem
					v-for="item in navItems"
					:key="item.label"
					:label="item.label"
					:icon="item.icon"
					:to="item.to"
					:active="item.routeNames.includes(route.name)"
					:suffix="item.suffix?.value"
				/>
				<SidebarItem
					:label="__('Search')"
					icon="lucide-search"
					@click="openCommandPalette"
				>
					<template #suffix>
						<KeyboardShortcut combo="Mod+K" class="mr-2 text-ink-gray-4" />
					</template>
				</SidebarItem>

				<SidebarSection
					v-for="group in spaceGroups"
					:key="group.key"
					:label="group.label"
					:collapsible="group.key === 'unpublished'"
					:collapsed="group.key === 'unpublished' && unpublishedCollapsed"
					@update:collapsed="unpublishedCollapsed = $event"
				>
					<ContextMenu :options="spaceMenu">
						<div class="flex flex-col gap-0.5">
							<SidebarItem
								v-for="space in group.spaces"
								:key="space.name"
								:label="space.space_name || space.name"
								:to="{ name: 'SpaceDetails', params: { spaceId: space.name } }"
								@contextmenu="openSpaceMenu(space)"
							>
								<template #prefix>
									<SpaceAvatar
										:space="space"
										:label="space.space_name || space.name"
										size="sm"
									/>
								</template>
								<!-- No unpublished icon: the Unpublished section already says it. -->
								<template #suffix>
									<span class="mr-2 flex items-center gap-1">
										<Tooltip v-if="isPinned(space.name)" :text="__('Pinned to top')">
											<span class="lucide-pin size-3.5 text-ink-gray-5" aria-hidden="true" />
										</Tooltip>
										<Tooltip v-if="space.git_synced" :text="__('Synced from GitHub')">
											<span class="lucide-folder-git-2 size-3.5 text-ink-gray-4" aria-hidden="true" />
										</Tooltip>
										<Tooltip v-if="restrictedSpaces.has(space.name)" :text="__('Restricted access')">
											<span class="lucide-lock size-3.5 text-ink-gray-4" aria-hidden="true" />
										</Tooltip>
									</span>
								</template>
							</SidebarItem>
						</div>
					</ContextMenu>

					<p
						v-if="group.key === 'published' && !spaces.loading && !orderedSpaces.length"
						class="px-2 py-3 text-sm text-ink-gray-5"
					>
						{{ __('No spaces yet') }}
					</p>
				</SidebarSection>
			</div>
		</ScrollArea>

		<template #footer>
			<div class="flex flex-col gap-1 px-2 pb-2">
				<Button
					v-if="isManager"
					variant="subtle"
					icon-left="plus"
					label="New Space"
					@click="showNewSpaceDialog = true"
				/>
			</div>
		</template>
	</Sidebar>

	<NewSpaceDialog v-model="showNewSpaceDialog" @created="onSpaceCreated" />
</template>

<script setup>
import {
	Button,
	ContextMenu,
	KeyboardShortcut,
	ScrollArea,
	Sidebar,
	SidebarHeader,
	SidebarItem,
	SidebarSection,
	Tooltip,
	createResource,
} from 'frappe-ui';
import { computed, inject, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useWikiStore } from '@/stores/wiki';
import NewSpaceDialog from './NewSpaceDialog.vue';
import SpaceAvatar from './SpaceAvatar.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const wikiStore = useWikiStore();
const openCommandPalette = inject('openCommandPalette', () => {});

const showNewSpaceDialog = ref(false);
const unpublishedCollapsed = ref(false);
const selectedSpace = ref(null);

const spaces = createResource({
	url: 'wiki.api.get_wiki_spaces',
	auto: true,
});

const isManager = computed(() => userStore.isWikiManager);
const orderedSpaces = computed(() => spaces.data || []);
const restrictedSpaces = computed(
	() => new Set(orderedSpaces.value.filter((s) => s.is_restricted).map((s) => s.name)),
);

const navItems = [
	{
		label: __('All Spaces'),
		icon: 'lucide-library',
		to: { name: 'Overview' },
		routeNames: ['Overview'],
	},
	{
		label: __('Change Requests'),
		icon: 'lucide-git-pull-request',
		to: { name: 'ChangeRequests' },
		routeNames: ['ChangeRequests', 'ChangeRequest'],
	},
];

const publishedSpaces = computed(() => orderedSpaces.value.filter((s) => s.is_published));
const unpublishedSpaces = computed(() => orderedSpaces.value.filter((s) => !s.is_published));
const spaceGroups = computed(() => [
	{
		key: 'published',
		label: __('Spaces'),
		spaces: publishedSpaces.value,
	},
	...(unpublishedSpaces.value.length
		? [
				{
					key: 'unpublished',
					label: __('Unpublished'),
					spaces: unpublishedSpaces.value,
				},
			]
		: []),
]);

const headerMenuItems = computed(() => [
	{
		label: __('Settings'),
		icon: 'settings',
		onClick: () => router.push({ name: 'WikiSettings' }),
	},
	{
		label: __('Log out'),
		icon: 'log-out',
		onClick: () => {
			window.location.href = '/api/method/logout';
		},
	},
]);

function isPinned(spaceName) {
	return wikiStore.pinnedSpaces?.includes(spaceName);
}

const spaceMenu = computed(() => [
	{
		label: isPinned(selectedSpace.value?.name) ? __('Unpin from top') : __('Pin to top'),
		icon: 'pin',
		onClick: () => {
			if (!selectedSpace.value) return;
			wikiStore.togglePin(selectedSpace.value.name);
		},
	},
]);

function openSpaceMenu(space) {
	selectedSpace.value = space;
}

async function onSpaceCreated(space) {
	await spaces.reload();
	showNewSpaceDialog.value = false;
	if (space?.name) {
		router.push({ name: 'SpaceDetails', params: { spaceId: space.name } });
	}
}
</script>

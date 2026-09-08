import { expect, test } from '@playwright/test';
import { createDoc, deleteDoc, getDoc, getList } from '../helpers/frappe';
import { appUrl } from '../helpers/routes';
import { createTestWikiSpace, deleteTestWikiSpace } from '../helpers/wiki';

function requestQuery(request: { postData: () => string | null }) {
	const body = request.postData() || '';
	try {
		const parsed = JSON.parse(body);
		return String(parsed.query || '');
	} catch {
		return new URLSearchParams(body).get('query') || '';
	}
}

/**
 * Space Settings -> Permissions role picker searches on the server.
 *
 * Regression for #709: the picker used to load a single page of roles and
 * filter it in the browser, so on any site with more roles than fit in that
 * page the rest were unreachable. Role labels are now localized, but their
 * canonical Role.name values must remain unchanged for authorization/storage.
 */
test.describe('Space Settings -> Permissions role search', () => {
	let roleName = '';
	let spaceName = '';

	test.afterEach(async ({ request }) => {
		// The space's child row links the role, so the space goes first.
		if (spaceName) await deleteTestWikiSpace(request, spaceName);
		if (roleName) await deleteDoc(request, 'Role', roleName);
		spaceName = '';
		roleName = '';
	});

	test('finds and adds an untranslated role that sorts past the first page', async ({
		page,
		request,
	}) => {
		// The bug only bites once there are more roles than one page holds.
		const enabledRoles = await getList(request, 'Role', {
			filters: { disabled: 0 },
			limit: 0,
		});
		expect(
			enabledRoles.length,
			'site needs more than one page of roles for this regression to bite',
		).toBeGreaterThan(20);

		roleName = `ZZZ Wiki Role ${Date.now()}`;
		await createDoc(request, 'Role', { role_name: roleName });

		const space = await createTestWikiSpace(request, {
			route: `role-search-${Date.now()}`,
		});
		spaceName = space.name;

		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto(appUrl('spaces', space.name));
		await page.waitForLoadState('networkidle');

		await page.getByTitle('Settings').first().click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await dialog.getByRole('tab', { name: 'Permissions', exact: true }).click();

		// Type a fragment that no role from the first page matches. The dedicated
		// server endpoint must still find it, and untranslated roles fall back to
		// their canonical name as the display label.
		const picker = dialog.getByPlaceholder('Search role to add');
		await expect(picker).toBeVisible();
		await picker.fill(roleName.slice(0, 12));

		// The popover is portaled out of the dialog, so it lives on the page.
		const option = page.getByRole('option', { name: roleName, exact: true });
		await expect(option).toBeVisible({ timeout: 10000 });
		await option.click();

		// Picking fills the field; Add commits the row, at Read by default.
		await dialog.getByRole('button', { name: 'Add', exact: true }).click();
		const row = dialog.getByRole('row').filter({ hasText: roleName });
		await expect(row).toBeVisible();

		await dialog.getByRole('button', { name: 'Save', exact: true }).click();

		await expect
			.poll(
				async () => {
					const doc = await getDoc<{
						roles?: { role: string; permission_level: string }[];
					}>(request, 'Wiki Space', space.name);
					return (doc.roles || []).find((r) => r.role === roleName)
						?.permission_level;
				},
				{ timeout: 10000 },
			)
			.toBe('Read');
	});

	test('searches a localized label but saves the canonical role name', async ({
		page,
		request,
	}) => {
		roleName = `ZZZ Wiki Finance Manager ${Date.now()}`;
		const localizedRoleName = '维基财务经理';
		const localizedQuery = '维基财务';
		await createDoc(request, 'Role', { role_name: roleName });

		const space = await createTestWikiSpace(request, {
			route: `localized-role-search-${Date.now()}`,
		});
		spaceName = space.name;

		// Inject one deterministic role translation into the SPA dictionary. This
		// keeps the rest of the application's real translations intact.
		await page.route('**/api/method/wiki.api.get_translations', async (route) => {
			const response = await route.fetch();
			const payload = await response.json();
			payload.message = {
				...(payload.message || {}),
				[roleName]: localizedRoleName,
			};
			await route.fulfill({
				response,
				body: JSON.stringify(payload),
			});
		});

		const submittedQueries: string[] = [];
		await page.route(
			'**/api/method/wiki.api.wiki_space.search_roles',
			async (route) => {
				const query = requestQuery(route.request());
				submittedQueries.push(query);
				const matches =
					!query ||
					roleName.toLowerCase().includes(query.toLowerCase()) ||
					localizedRoleName.includes(query);
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						message: matches
							? [{ value: roleName, label: localizedRoleName }]
							: [],
					}),
				});
			},
		);

		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto(appUrl('spaces', space.name));
		await page.waitForLoadState('networkidle');

		await page.getByTitle('Settings').first().click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await dialog.getByRole('tab', { name: 'Permissions', exact: true }).click();

		const picker = dialog.getByPlaceholder('Search role to add');
		await expect(picker).toBeVisible();
		await picker.fill(localizedQuery);

		await expect
			.poll(() => submittedQueries, { timeout: 10000 })
			.toContain(localizedQuery);

		const option = page.getByRole('option', {
			name: localizedRoleName,
			exact: true,
		});
		await expect(option).toBeVisible({ timeout: 10000 });
		await option.click();
		await dialog.getByRole('button', { name: 'Add', exact: true }).click();

		const row = dialog.getByRole('row').filter({ hasText: localizedRoleName });
		await expect(row).toBeVisible();
		await expect(row).not.toContainText(roleName);

		await dialog.getByRole('button', { name: 'Save', exact: true }).click();

		await expect
			.poll(
				async () => {
					const doc = await getDoc<{
						roles?: { role: string; permission_level: string }[];
					}>(request, 'Wiki Space', space.name);
					return (doc.roles || []).find((r) => r.role === roleName)
						?.permission_level;
				},
				{ timeout: 10000 },
			)
			.toBe('Read');
	});
});

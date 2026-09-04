import frappe


DEFAULT_SPACE_ROUTE = "docs"
DEFAULT_SPACE_NAME = "Wiki"
DEFAULT_HOME_TAB = "Home"
DEFAULT_PAGE_TITLE = "Welcome to Frappe Wiki"
DEFAULT_PAGE_CONTENT = "# Welcome to Frappe Wiki!"


def execute():
	"""Localize only the untouched upstream starter content.

	Existing user-authored spaces and pages are left alone. The patch targets
	the exact values created by ``wiki.install.after_install`` so upgrading the
	CN thin fork cannot overwrite customized content.
	"""
	space = frappe.db.get_value(
		"Wiki Space",
		{"route": DEFAULT_SPACE_ROUTE, "space_name": DEFAULT_SPACE_NAME},
		["name", "root_group", "home_tab_title"],
		as_dict=True,
	)
	if not space:
		return

	if space.home_tab_title == DEFAULT_HOME_TAB:
		frappe.db.set_value(
			"Wiki Space",
			space.name,
			"home_tab_title",
			"首页",
			update_modified=False,
		)

	if not space.root_group:
		return

	starter_pages = frappe.get_all(
		"Wiki Document",
		filters={
			"parent_wiki_document": space.root_group,
			"title": DEFAULT_PAGE_TITLE,
		},
		fields=["name", "content"],
	)
	for page in starter_pages:
		if (page.content or "").strip() != DEFAULT_PAGE_CONTENT:
			continue
		frappe.db.set_value(
			"Wiki Document",
			page.name,
			{
				"title": "欢迎使用 Frappe Wiki",
				"content": "# 欢迎使用 Frappe Wiki！",
			},
			update_modified=False,
		)

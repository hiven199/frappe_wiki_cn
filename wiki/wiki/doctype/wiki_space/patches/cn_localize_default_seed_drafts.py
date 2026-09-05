import frappe

from wiki.frappe_wiki.doctype.wiki_revision.wiki_revision import (
	ensure_overlay_item,
	get_effective_revision_item_map,
	get_or_create_content_blob,
	recompute_revision_hashes,
)


DEFAULT_SPACE_ROUTE = "docs"
DEFAULT_SPACE_NAME = "Wiki"
DEFAULT_PAGE_TITLE = "Welcome to Frappe Wiki"
DEFAULT_PAGE_CONTENT = "# Welcome to Frappe Wiki!"
LOCALIZED_PAGE_TITLE = "欢迎使用 Wiki"
LOCALIZED_PAGE_CONTENT = "# 欢迎使用 Wiki！"


def execute():
	"""Localize only untouched starter content inside open draft overlays.

	The live starter document is handled by ``cn_localize_default_seed``. Sites
	that opened the editor before that patch may still have a Draft change
	request whose head revision snapshots the original English starter page.
	That stale overlay wins over the now-localized live document in the SPA.

	This patch is deliberately narrow: it only touches Draft change requests in
	the exact upstream starter space, for the exact starter document ``doc_key``,
	and only when both the effective title and blob content still equal the
	upstream seed values. User-authored or partially edited drafts are untouched.
	"""
	space = frappe.db.get_value(
		"Wiki Space",
		{"route": DEFAULT_SPACE_ROUTE, "space_name": DEFAULT_SPACE_NAME},
		["name", "root_group"],
		as_dict=True,
	)
	if not space or not space.root_group:
		return

	starter_page = frappe.db.get_value(
		"Wiki Document",
		{
			"parent_wiki_document": space.root_group,
			"title": ("in", [DEFAULT_PAGE_TITLE, LOCALIZED_PAGE_TITLE]),
		},
		["name", "doc_key", "route"],
		as_dict=True,
	)
	if not starter_page or not starter_page.doc_key:
		return

	localized_blob = get_or_create_content_blob(LOCALIZED_PAGE_CONTENT)

	drafts = frappe.get_all(
		"Wiki Change Request",
		filters={"wiki_space": space.name, "status": "Draft"},
		fields=["name", "head_revision"],
	)
	for draft in drafts:
		head_revision = draft.get("head_revision")
		if not head_revision:
			continue

		effective = get_effective_revision_item_map(head_revision)
		item = effective.get(starter_page.doc_key)
		if not item or item.get("is_deleted"):
			continue
		if item.get("title") != DEFAULT_PAGE_TITLE:
			continue
		if (item.get("route") or "") != (starter_page.route or ""):
			continue

		content_blob = item.get("content_blob")
		content = (
			frappe.db.get_value("Wiki Content Blob", content_blob, "content")
			if content_blob
			else ""
		)
		if (content or "").strip() != DEFAULT_PAGE_CONTENT:
			continue

		item_name = ensure_overlay_item(head_revision, starter_page.doc_key)
		if not item_name:
			continue

		frappe.db.set_value(
			"Wiki Revision Item",
			item_name,
			{
				"title": LOCALIZED_PAGE_TITLE,
				"content_blob": localized_blob,
			},
			update_modified=False,
		)
		recompute_revision_hashes(head_revision)

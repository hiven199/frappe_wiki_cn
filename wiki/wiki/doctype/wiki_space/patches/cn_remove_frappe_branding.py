import frappe

from wiki.frappe_wiki.doctype.wiki_revision.wiki_revision import (
	ensure_overlay_item,
	get_effective_revision_item_map,
	get_or_create_content_blob,
	recompute_revision_hashes,
)


DEFAULT_SPACE_ROUTE = "docs"
DEFAULT_SPACE_NAME = "Wiki"
UPSTREAM_TITLE = "Welcome to Frappe Wiki"
UPSTREAM_CONTENT = "# Welcome to Frappe Wiki!"
OLD_CN_TITLE = "欢迎使用 Frappe Wiki"
OLD_CN_CONTENT = "# 欢迎使用 Frappe Wiki！"
NEW_CN_TITLE = "欢迎使用 Wiki"
NEW_CN_CONTENT = "# 欢迎使用 Wiki！"


def _is_untouched_starter(title, content):
	content = (content or "").strip()
	return (title, content) in {
		(UPSTREAM_TITLE, UPSTREAM_CONTENT),
		(OLD_CN_TITLE, OLD_CN_CONTENT),
	}


def execute():
	"""Remove the Frappe product prefix from untouched CN starter content.

	Only the exact upstream/CN starter page and exact untouched Draft overlays are
	updated. User-authored content, routes and non-Draft change requests are left
	unchanged.
	"""
	space = frappe.db.get_value(
		"Wiki Space",
		{"route": DEFAULT_SPACE_ROUTE, "space_name": DEFAULT_SPACE_NAME},
		["name", "root_group"],
		as_dict=True,
	)
	if not space or not space.root_group:
		return

	pages = frappe.get_all(
		"Wiki Document",
		filters={
			"parent_wiki_document": space.root_group,
			"title": ("in", [UPSTREAM_TITLE, OLD_CN_TITLE, NEW_CN_TITLE]),
		},
		fields=["name", "doc_key", "route", "title", "content"],
	)
	starter_page = next((p for p in pages if _is_untouched_starter(p.title, p.content)), None)
	if starter_page:
		frappe.db.set_value(
			"Wiki Document",
			starter_page.name,
			{"title": NEW_CN_TITLE, "content": NEW_CN_CONTENT},
			update_modified=False,
		)
	else:
		starter_page = next((p for p in pages if p.title == NEW_CN_TITLE), None)

	if not starter_page or not starter_page.doc_key:
		return

	new_blob = get_or_create_content_blob(NEW_CN_CONTENT)
	drafts = frappe.get_all(
		"Wiki Change Request",
		filters={"wiki_space": space.name, "status": "Draft"},
		fields=["name", "head_revision"],
	)
	for draft in drafts:
		head_revision = draft.get("head_revision")
		if not head_revision:
			continue
		item = get_effective_revision_item_map(head_revision).get(starter_page.doc_key)
		if not item or item.get("is_deleted"):
			continue
		if (item.get("route") or "") != (starter_page.route or ""):
			continue

		blob_name = item.get("content_blob")
		content = frappe.db.get_value("Wiki Content Blob", blob_name, "content") if blob_name else ""
		if not _is_untouched_starter(item.get("title"), content):
			continue

		item_name = ensure_overlay_item(head_revision, starter_page.doc_key)
		if not item_name:
			continue
		frappe.db.set_value(
			"Wiki Revision Item",
			item_name,
			{"title": NEW_CN_TITLE, "content_blob": new_blob},
			update_modified=False,
		)
		recompute_revision_hashes(head_revision)

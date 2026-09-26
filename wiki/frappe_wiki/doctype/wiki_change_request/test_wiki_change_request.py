"""Compatibility wrapper for Wiki Change Request tests on Frappe v16.

The v3.2.1 merge combined the upstream synchronous index_doc regression tests
with this fork's after-commit Wiki-owned reindex worker. Two inherited tests
therefore exercised the wrong execution boundary. Keep the merged test module
intact in ``wiki_change_request_test_base`` and override only those two tests.
"""

from . import wiki_change_request_test_base as _base

# Re-export the original module so Frappe/unittest discovers the exact same test
# classes and helpers. The backup filename intentionally does not start with
# ``test_`` and therefore is not discovered a second time.
for _name in dir(_base):
	if not _name.startswith("__"):
		globals()[_name] = getattr(_base, _name)


def _test_content_only_merge_queues_search_reindex(self):
	"""Merge requests the Wiki-owned reindex helper and its worker refreshes search."""
	from unittest.mock import patch

	from wiki.frappe_wiki.doctype.wiki_document.wiki_sqlite_search import (
		WikiSQLiteSearch,
		reindex_docs,
	)

	space = _base.create_test_wiki_space()
	page = _base.create_test_wiki_document(
		space.root_group,
		title="Search Page",
		content="staletermv1zzz",
	)

	search = WikiSQLiteSearch()
	search.drop_index()
	search.build_index()

	cr = _base.create_change_request(space.name, "CR Search Reindex")
	page_key = _base.frappe.get_value("Wiki Document", page.name, "doc_key")
	_base.update_cr_page(cr.name, page_key, {"content": "freshtermv2zzz"})

	with patch(
		"wiki.frappe_wiki.doctype.wiki_document.wiki_sqlite_search.enqueue_reindex"
	) as enqueue_reindex:
		_base._approve_and_merge(cr.name)

	enqueue_reindex.assert_called_once_with([page.name])

	# Production schedules this helper with enqueue_after_commit. Run the same
	# worker synchronously here so the regression test can verify index contents.
	reindex_docs([page.name])

	stale_names = [r["name"] for r in search.search("staletermv1zzz")["results"]]
	fresh_names = [r["name"] for r in search.search("freshtermv2zzz")["results"]]
	self.assertNotIn(page.name, stale_names)
	self.assertIn(page.name, fresh_names)


def _test_content_only_merge_reindexes_through_index_doc(self):
	"""The Wiki-owned worker uses index_doc, the API available on Frappe v16."""
	from unittest.mock import patch

	from wiki.frappe_wiki.doctype.wiki_document.wiki_sqlite_search import (
		WikiSQLiteSearch,
		reindex_docs,
	)

	space = _base.create_test_wiki_space()
	page = _base.create_test_wiki_document(
		space.root_group,
		title="V16 Page",
		content="stalev16zzz",
	)

	WikiSQLiteSearch().build_index()

	cr = _base.create_change_request(space.name, "CR V16 Reindex")
	page_key = _base.frappe.get_value("Wiki Document", page.name, "doc_key")
	_base.update_cr_page(cr.name, page_key, {"content": "freshv16zzz"})

	with patch.object(WikiSQLiteSearch, "index_doc", autospec=True) as index_doc:
		_base._approve_and_merge(cr.name)
		# The merge enqueues reindex_docs after commit; invoke that worker directly
		# to assert its version-16 index_doc contract without requiring a queue run.
		reindex_docs([page.name])

	self.assertIn(
		("Wiki Document", page.name),
		[call.args[1:] for call in index_doc.call_args_list],
	)


_base.TestWikiChangeRequest.test_content_only_merge_queues_search_reindex = (
	_test_content_only_merge_queues_search_reindex
)
_base.TestWikiChangeRequest.test_content_only_merge_reindexes_through_index_doc = (
	_test_content_only_merge_reindexes_through_index_doc
)

# The class object is shared with the base module; exporting it after overriding
# the methods makes unittest collect the corrected methods under the canonical
# test module path.
TestWikiChangeRequest = _base.TestWikiChangeRequest

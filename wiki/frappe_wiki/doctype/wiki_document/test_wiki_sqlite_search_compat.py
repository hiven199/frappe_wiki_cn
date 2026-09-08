from unittest.mock import call, patch

from frappe.tests.utils import FrappeTestCase

from wiki.frappe_wiki.doctype.wiki_document.wiki_sqlite_search import enqueue_reindex, reindex_docs


class TestWikiSQLiteSearchV16Compatibility(FrappeTestCase):
	@patch("wiki.frappe_wiki.doctype.wiki_document.wiki_sqlite_search.frappe.enqueue")
	@patch("wiki.frappe_wiki.doctype.wiki_document.wiki_sqlite_search.WikiSQLiteSearch")
	def test_enqueue_reindex_deduplicates_and_defers_until_commit(self, search_cls, mock_enqueue):
		search = search_cls.return_value
		search.is_search_enabled.return_value = True
		search.index_exists.return_value = True

		enqueue_reindex(["DOC-1", "DOC-1", "", None, "DOC-2"])

		mock_enqueue.assert_called_once_with(
			"wiki.frappe_wiki.doctype.wiki_document.wiki_sqlite_search.reindex_docs",
			docnames=["DOC-1", "DOC-2"],
			enqueue_after_commit=True,
		)

	@patch("wiki.frappe_wiki.doctype.wiki_document.wiki_sqlite_search.frappe.enqueue")
	@patch("wiki.frappe_wiki.doctype.wiki_document.wiki_sqlite_search.WikiSQLiteSearch")
	def test_enqueue_reindex_empty_input_is_noop(self, search_cls, mock_enqueue):
		enqueue_reindex([])

		search_cls.assert_not_called()
		mock_enqueue.assert_not_called()

	@patch("wiki.frappe_wiki.doctype.wiki_document.wiki_sqlite_search.frappe.log_error")
	@patch("wiki.frappe_wiki.doctype.wiki_document.wiki_sqlite_search.WikiSQLiteSearch")
	def test_reindex_docs_uses_index_doc_and_isolates_failures(self, search_cls, mock_log_error):
		search = search_cls.return_value
		search.is_search_enabled.return_value = True
		search.index_exists.return_value = True
		search.index_doc.side_effect = [RuntimeError("first document failed"), None]

		reindex_docs(["DOC-1", "DOC-1", "", None, "DOC-2"])

		self.assertEqual(
			search.index_doc.call_args_list,
			[
				call("Wiki Document", "DOC-1"),
				call("Wiki Document", "DOC-2"),
			],
		)
		mock_log_error.assert_called_once_with(
			title="Wiki Search Reindex Error",
			message="Failed to re-index Wiki Document DOC-1",
		)

	@patch("wiki.frappe_wiki.doctype.wiki_document.wiki_sqlite_search.frappe.enqueue")
	@patch("wiki.frappe_wiki.doctype.wiki_document.wiki_sqlite_search.WikiSQLiteSearch")
	def test_enqueue_reindex_skips_when_search_index_is_unavailable(self, search_cls, mock_enqueue):
		search = search_cls.return_value
		search.is_search_enabled.return_value = True
		search.index_exists.return_value = False

		enqueue_reindex(["DOC-1"])

		mock_enqueue.assert_not_called()

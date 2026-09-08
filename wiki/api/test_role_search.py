from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from wiki.api.wiki_space import search_roles


class TestRoleSearchAPI(FrappeTestCase):
	def setUp(self):
		frappe.set_user("Administrator")

		root_group = frappe.new_doc("Wiki Document")
		root_group.title = f"Role Search Root {frappe.generate_hash(length=6)}"
		root_group.is_group = 1
		root_group.insert()

		self.space = frappe.new_doc("Wiki Space")
		self.space.space_name = f"Role Search Space {frappe.generate_hash(length=6)}"
		self.space.route = f"role-search-{frappe.generate_hash(length=6)}"
		self.space.root_group = root_group.name
		self.space.insert()

		self.translated_role = self._create_role(
			f"ZZZ Wiki Finance Manager {frappe.generate_hash(length=6)}"
		)
		self.fallback_role = self._create_role(
			f"ZZZ Wiki Untranslated {frappe.generate_hash(length=6)}"
		)

	def tearDown(self):
		frappe.set_user("Administrator")
		frappe.db.rollback()

	def _create_role(self, role_name: str) -> str:
		role = frappe.get_doc({"doctype": "Role", "role_name": role_name})
		role.insert(ignore_permissions=True)
		return role.name

	def test_searches_canonical_and_localized_role_names(self):
		localized = "维基财务经理"
		translations = {self.translated_role: localized}

		with (
			patch("wiki.api._get_effective_language", return_value="zh"),
			patch("wiki.api.wiki_space.get_all_translations", return_value=translations),
		):
			by_canonical = search_roles(
				self.space.name,
				query="Wiki Finance Manager",
			)
			by_localized = search_roles(
				self.space.name,
				query="财务经理",
			)

		self.assertIn(
			{"value": self.translated_role, "label": localized},
			by_canonical,
		)
		self.assertIn(
			{"value": self.translated_role, "label": localized},
			by_localized,
		)

	def test_untranslated_role_uses_canonical_name_as_label(self):
		with (
			patch("wiki.api._get_effective_language", return_value="zh"),
			patch("wiki.api.wiki_space.get_all_translations", return_value={}),
		):
			results = search_roles(
				self.space.name,
				query="Wiki Untranslated",
			)

		self.assertIn(
			{"value": self.fallback_role, "label": self.fallback_role},
			results,
		)

	def test_limit_is_bounded_and_applied(self):
		with (
			patch("wiki.api._get_effective_language", return_value="en"),
			patch("wiki.api.wiki_space.get_all_translations", return_value={}),
		):
			results = search_roles(self.space.name, limit=1)

		self.assertEqual(len(results), 1)

	def test_requires_write_permission_on_target_space(self):
		frappe.set_user("Guest")

		with self.assertRaises(frappe.PermissionError):
			search_roles(self.space.name, query="Wiki")

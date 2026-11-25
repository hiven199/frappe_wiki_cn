"""No-Frappe Wiki brand icon unit contract."""
from types import SimpleNamespace
from unittest import TestCase
from wiki.branding_icon import optional_brand_icon

ICON = "/assets/frappe_cn_fix/branding/icons/wiki-v3.png"


class WikiOptionalBrandingTest(TestCase):
    def test_site_logo_priority(self):
        load = lambda _: SimpleNamespace(get_app_brand_url=lambda app: ICON)
        self.assertEqual(optional_brand_icon("/files/site-icon.png", load=load), "")

    def test_plugin_optional(self):
        def absent(_):
            raise ImportError("frappe_cn_fix")
        self.assertEqual(optional_brand_icon(None, load=absent), "")

    def test_exact_asset_and_trust(self):
        good = lambda _: SimpleNamespace(get_app_brand_url=lambda app: ICON)
        self.assertEqual(optional_brand_icon("", load=good), ICON)
        bad = lambda _: SimpleNamespace(get_app_brand_url=lambda app: "https://evil.invalid/icon.png")
        self.assertEqual(optional_brand_icon("", load=bad), "")

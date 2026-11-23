"""Wiki optionals must never prevent SPA bootstrap on broken branding assets."""
from types import SimpleNamespace
from unittest import TestCase

from wiki.branding_icon import optional_brand_icon, optional_touch_icon


def fail(*_args):
    raise OSError("optional asset pack unavailable")


class WikiOptionalFailureTest(TestCase):
    def test_failed_loader_falls_back(self):
        self.assertEqual(optional_brand_icon(load=fail), "")
        self.assertEqual(optional_touch_icon(load=fail), "")

    def test_failed_provider_falls_back(self):
        icon = lambda _: SimpleNamespace(get_app_brand_url=fail)
        pwa = lambda _: SimpleNamespace(get_pwa_urls=fail)
        self.assertEqual(optional_brand_icon(load=icon), "")
        self.assertEqual(optional_touch_icon(load=pwa), "")

    def test_bad_pwa_result_falls_back(self):
        for value in ([], "invalid", True, 42):
            loader = lambda _: SimpleNamespace(get_pwa_urls=lambda app: value)
            self.assertEqual(optional_touch_icon(load=loader), "")

    def test_customer_favicon_short_circuits_provider(self):
        self.assertEqual(optional_brand_icon("/files/tenant.ico", load=fail), "")
        self.assertEqual(optional_touch_icon("/files/tenant.ico", load=fail), "")

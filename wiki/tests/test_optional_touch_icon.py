from types import SimpleNamespace
from unittest import TestCase
from wiki.branding_icon import optional_touch_icon


class WikiOptionalTouchIconTest(TestCase):
    def test_missing_optional_app(self):
        def missing(_):
            raise ImportError("no pack")
        self.assertEqual(optional_touch_icon(None, load=missing), "")

    def test_user_icon_priority(self):
        def load(_):
            return SimpleNamespace(get_pwa_urls=lambda app: {
                "apple_touch_icon_url": "/assets/frappe_cn_fix/branding/pwa/wiki/apple-touch-180-v1.png"})
        self.assertEqual(optional_touch_icon("/files/user.png", load=load), "")
        self.assertEqual(optional_touch_icon(None, load=load),
                         "/assets/frappe_cn_fix/branding/pwa/wiki/apple-touch-180-v1.png")

    def test_external_rejected(self):
        def load(_):
            return SimpleNamespace(get_pwa_urls=lambda app: {"apple_touch_icon_url": "//outside.invalid/1.png"})
        self.assertEqual(optional_touch_icon(None, load=load), "")

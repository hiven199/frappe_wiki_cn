from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PANEL = ROOT / "frontend" / "src" / "components" / "SpaceSettings" / "GitSyncPanel.vue"
SPACE_STORE = ROOT / "frontend" / "src" / "stores" / "space.js"


class TestWikiSyncStatusI18nStatic(unittest.TestCase):
    def test_settings_panel_localizes_persisted_sync_statuses(self):
        source = PANEL.read_text(encoding="utf-8")
        for msgid in (
            "Sync succeeded",
            "Sync failed",
            "Sync in progress",
            "No changes",
        ):
            self.assertIn(f"__('{msgid}')", source)
        self.assertNotIn("status ||\n\t\t__('Sync in progress')", source)

    def test_space_store_localizes_same_sync_statuses(self):
        source = SPACE_STORE.read_text(encoding="utf-8")
        for msgid in (
            "Sync succeeded",
            "Sync failed",
            "Sync in progress",
            "No changes",
        ):
            self.assertIn(f"__('{msgid}')", source)
        self.assertIn("syncStatusLabel", source)

    def test_settings_error_display_strips_python_exception_prefix_before_translation(self):
        source = PANEL.read_text(encoding="utf-8")
        self.assertIn("function firstLine(text)", source)
        self.assertIn("return __(message);", source)
        self.assertIn("(?:Error|Exception)", source)


if __name__ == "__main__":
    unittest.main()

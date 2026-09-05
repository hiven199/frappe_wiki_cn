from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
LAYOUT = ROOT / "wiki/templates/wiki/layout.html"
VIEWER_JS = ROOT / "wiki/public/js/image-viewer.js"


class TestImageViewerZoomStatic(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.layout = LAYOUT.read_text(encoding="utf-8")
        cls.viewer_js = VIEWER_JS.read_text(encoding="utf-8")

    def test_reader_exposes_zoom_toolbar_and_stage(self):
        required = [
            'id="image-viewer-stage"',
            'id="image-viewer-toolbar"',
            'id="image-viewer-zoom"',
            'data-image-viewer-action="zoom-out"',
            'data-image-viewer-action="zoom-in"',
            'data-image-viewer-action="actual"',
            'data-image-viewer-action="fit"',
            'data-image-viewer-action="close"',
            'aria-modal="true"',
        ]
        for token in required:
            self.assertIn(token, self.layout)

    def test_viewer_supports_fit_actual_zoom_drag_and_pinch(self):
        required = [
            "fitToScreen",
            "actualSize",
            "zoomTo",
            "pointerDistance",
            "pointerMidpoint",
            "MAX_SCALE = 4",
            'event.key === "Escape"',
            'event.key === "0"',
            'event.key === "1"',
        ]
        for token in required:
            self.assertIn(token, self.viewer_js)

        # Allow the listener call to wrap across lines; formatting must not make
        # this static contract fail when the actual event wiring is present.
        for event_name in ("wheel", "dblclick", "pointerdown", "pointermove"):
            self.assertRegex(
                self.viewer_js,
                rf'addEventListener\(\s*"{re.escape(event_name)}"',
            )

    def test_viewer_supports_rendered_mermaid_svg(self):
        required = [
            '#wiki-content .mermaid[data-processed] svg',
            "openSvg",
            "svgDimensions",
            "XMLSerializer",
            "URL.createObjectURL",
            'type: "image/svg+xml;charset=utf-8"',
            "viewBox",
        ]
        for token in required:
            self.assertIn(token, self.viewer_js)

    def test_viewer_no_longer_closes_on_touch_move(self):
        self.assertNotRegex(self.viewer_js, r'addEventListener\(\s*"touchmove"')
        self.assertIn('document.body.classList.add("image-viewer-open")', self.viewer_js)
        self.assertIn('document.body.classList.remove("image-viewer-open")', self.viewer_js)


if __name__ == "__main__":
    unittest.main()

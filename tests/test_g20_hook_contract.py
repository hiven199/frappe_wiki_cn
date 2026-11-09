"""G20-B2: static hook contract for Frappe 16.55 / Wiki 3.4.0 (no site, no import of frappe).

Every dotted path in wiki/hooks.py must resolve to a top-level class/function in its module
file, and the deprecated legacy renderer (which imports a function that no longer exists)
must stay unregistered so it can never be loaded by the website router.
"""
from __future__ import annotations

import ast
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOOKS = ROOT / "wiki/hooks.py"
PREFIXES = ("wiki.",)


def _hook_paths() -> set[str]:
	paths: set[str] = set()
	for node in ast.walk(ast.parse(HOOKS.read_text(encoding="utf8"))):
		if isinstance(node, ast.Constant) and isinstance(node.value, str):
			value = node.value
			if value.startswith(PREFIXES) and value.count(".") >= 2 and " " not in value and "/" not in value:
				paths.add(value)
	return paths


def _defines(module_file: Path, name: str) -> bool:
	tree = ast.parse(module_file.read_text(encoding="utf8"))
	for node in tree.body:
		if isinstance(node, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
			return True
		if isinstance(node, ast.Assign) and any(getattr(t, "id", None) == name for t in node.targets):
			return True
	return False


def test_every_hook_path_resolves():
	paths = _hook_paths()
	assert paths, "no dotted hook paths found"
	unresolved = []
	for path in sorted(paths):
		module, _, attr = path.rpartition(".")
		file = ROOT / (module.replace(".", "/") + ".py")
		if file.exists():
			if not _defines(file, attr):
				unresolved.append(path)
		elif not (ROOT / module.replace(".", "/")).is_dir():
			unresolved.append(path)
	assert not unresolved, unresolved


def test_legacy_wiki_page_renderer_stays_unregistered():
	text = HOOKS.read_text(encoding="utf8")
	assert "wiki_page.wiki_renderer" not in text
	assert "WikiPageRenderer" not in text
	assert "wiki.wiki.crawler_renderer.CrawlerRenderer" in text
	assert "WikiDocumentRenderer" in text


if __name__ == "__main__":
	test_every_hook_path_resolves()
	test_legacy_wiki_page_renderer_stays_unregistered()
	print("PASS_G20_WIKI_HOOK_CONTRACT")

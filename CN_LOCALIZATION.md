# Frappe Wiki CN Thin Fork

This repository remains a thin fork of upstream `frappe/wiki`. The internal Frappe app identity stays `wiki`; DocTypes, Python packages, routes, and `wiki.api.*` contracts must remain upstream-compatible.

## Version-16 baseline

- Upstream release: `v3.0.0`
- Upstream commit: `0a6025159289bcdaae26d727ada34764370ac765`
- Long-lived CN baseline branch: `version-16`

## Localization ownership

The thin fork owns source-level localization seams that cannot be solved by PO files alone:

1. Translation data is loaded before the Vue application mounts, preventing one-time setup values from freezing English labels.
2. User-visible Vue/JavaScript strings must flow through the Wiki translation function.
3. Standalone Vue apps created for editor popups must import the shared translator directly instead of relying on root-app global properties.
4. An unset `User.language` inherits `System Settings.language` before falling back to English.
5. Fresh/untouched upstream starter data may receive conservative Chinese defaults; customized user content must never be overwritten.

`frappe_cn_fix` remains responsible for the Chinese gettext dictionary (`zh.po`/`zh.mo`), terminology, extraction, and merge. This fork makes the source translatable; it does not duplicate the translation catalog.

## Non-goals

- Reimplementing Wiki business features.
- Renaming the internal `wiki` Frappe app or Python package.
- Breaking upstream API/DocType compatibility.
- Translating product/technical proper nouns that should remain in their canonical form.

## Validation

Run the source-level localization gate before runtime acceptance:

```bash
yarn test:cn-i18n
```

The final acceptance is runtime/UI based: no unintended English leakage in Chinese mode, while canonical technical names such as GitHub, Markdown, WebP, JSON, API, and language names may remain unchanged.

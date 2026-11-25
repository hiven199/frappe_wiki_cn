# BRAND-V16-R2 · Wiki 独立 SPA Favicon 适配

- 使用 Wiki 已有 `wiki/www/wiki_app.py` 的 Boot 与 `jinjaBootData` 构建管线，不新增公开 HTTP API，不修改数据库。
- `wiki_brand_icon_url` 只有在站点 `frappe_cn_fix_branding_enabled` 开启、站点未设置自有 Website Settings Favicon 时才非空。
- `frontend/src/branding_icon.mjs` 仅在 HTML 原生 `/favicon.png?v=2` 且 URL 为本地 `wiki-vN.png` 时精确替换；不会碰用户自定义图片。
- 源图 234×234 RGBA，保持原图 alpha 和外围像素 100% 不变；资源在 frappe_cn_fix 统一管理。
- 原 Wiki PWA 以及其他图片消费点、打包后的 `wiki/www/wiki-app.html` 仍须在升级稳定后隔离构建、Playwright/HTTP 核对。
- Draft + [skip ci]，不合并、不部署、不触发 Actions。

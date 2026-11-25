"""Opt-in Wiki app favicon URL; site-owned icon is authoritative."""
from importlib import import_module

NATIVE = {None, "", "/assets/frappe/images/frappe-favicon.svg"}


def optional_brand_icon(site_favicon=None, load=import_module) -> str:
    if site_favicon not in NATIVE:
        return ""
    try:
        branding = load("frappe_cn_fix.branding_assets")
        resolver = getattr(branding, "get_app_brand_url", None)
        if not callable(resolver):
            return ""
        url = resolver("wiki")
    except Exception:
        return ""
    if not isinstance(url, str):
        return ""
    if url.startswith("/assets/frappe_cn_fix/branding/icons/wiki-v") and url.endswith(".png"):
        return url
    return ""


def optional_touch_icon(site_favicon=None, load=import_module) -> str:
    """Optional Wiki iOS touch icon only; this does not introduce a PWA."""
    if site_favicon not in NATIVE:
        return ""
    try:
        provider = load("frappe_cn_fix.branding_pwa")
        resolver = getattr(provider, "get_pwa_urls", None)
        if not callable(resolver):
            return ""
        pack = resolver("wiki") or {}
    except Exception:
        return ""
    if not isinstance(pack, dict):
        return ""
    value = pack.get("apple_touch_icon_url")
    return (
        value if value == "/assets/frappe_cn_fix/branding/pwa/wiki/apple-touch-180-v1.png"
        else ""
    )

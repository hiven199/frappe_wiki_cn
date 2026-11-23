"""Opt-in Wiki app favicon URL; site-owned icon is authoritative."""
from importlib import import_module

NATIVE = {None, "", "/assets/frappe/images/frappe-favicon.svg"}


def optional_brand_icon(site_favicon=None, load=import_module) -> str:
    if site_favicon not in NATIVE:
        return ""
    try:
        branding = load("frappe_cn_fix.branding_assets")
    except ImportError:
        return ""
    resolver = getattr(branding, "get_app_brand_url", None)
    if not callable(resolver):
        return ""
    url = resolver("wiki")
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
    except ImportError:
        return ""
    resolver = getattr(provider, "get_pwa_urls", None)
    if not callable(resolver):
        return ""
    value = (resolver("wiki") or {}).get("apple_touch_icon_url")
    return (
        value if value == "/assets/frappe_cn_fix/branding/pwa/wiki/apple-touch-180-v1.png"
        else ""
    )

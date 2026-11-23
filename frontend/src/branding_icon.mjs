/** Only replace the Wiki's native favicon when a registered opt-in brand is present. */
export function applyWikiBrandIcon(boot, documentRef) {
	const url = boot?.wiki_brand_icon_url;
	if (typeof url !== 'string' ||
		!/^\/assets\/frappe_cn_fix\/branding\/icons\/wiki-v[0-9]+\.png$/.test(url)) {
		return false;
	}
	const link = documentRef?.querySelector?.('link[rel="icon"]');
	if (!link || link.getAttribute('href') !== '/favicon.png?v=2') return false;
	link.setAttribute('href', url);
	return true;
}

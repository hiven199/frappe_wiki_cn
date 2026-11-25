import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyWikiBrandIcon } from '../frontend/src/branding_icon.mjs'

function page(href) {
	let value = href
	return {
		querySelector: (selector) => selector === 'link[rel="icon"]'
			? { getAttribute: () => value, setAttribute: (_name, next) => { value = next } }
			: null,
		current: () => value
	}
}

test('enabled branding swaps stock icon and preserves custom link', () => {
	const url = '/assets/frappe_cn_fix/branding/icons/wiki-v3.png'
	const original = page('/favicon.png?v=2')
	assert.equal(applyWikiBrandIcon({ wiki_brand_icon_url: url }, original), true)
	assert.equal(original.current(), url)
	const custom = page('/files/site.ico')
	assert.equal(applyWikiBrandIcon({ wiki_brand_icon_url: url }, custom), false)
	assert.equal(custom.current(), '/files/site.ico')
})
test('disabled/untrusted paths do not mutate the document', () => {
	const x = page('/favicon.png?v=2')
	for (const url of [null, '', '/files/logo.png', 'https://example.invalid/logo.png']) {
		assert.equal(applyWikiBrandIcon({ wiki_brand_icon_url: url }, x), false)
	}
	assert.equal(x.current(), '/favicon.png?v=2')
})

test('production favicon emitted under the configured Vite base is a native icon', () => {
	const url = '/assets/frappe_cn_fix/branding/icons/wiki-v3.png'
	const built = page('/assets/wiki/frontend/favicon.png?v=2')
	assert.equal(applyWikiBrandIcon({ wiki_brand_icon_url: url }, built), true)
	assert.equal(built.current(), url)
	for (const href of ['/files/favicon.png?v=2', '/assets/other/favicon.png?v=2',
		'/assets/wiki/frontend/favicon.png?customer=1', 'https://example.invalid/favicon.png?v=2']) {
		const custom = page(href)
		assert.equal(applyWikiBrandIcon({ wiki_brand_icon_url: url }, custom), false)
		assert.equal(custom.current(), href)
	}
})

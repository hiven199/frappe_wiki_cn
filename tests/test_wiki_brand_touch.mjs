import test from 'node:test'
import assert from 'node:assert/strict'
import {applyWikiBrandIcon} from '../frontend/src/branding_icon.mjs'

for (const href of ['/favicon.png?v=2', '/assets/wiki/frontend/favicon.png?v=2']) {
test(`Wiki may add iOS icon after replacing the native favicon ${href}`,()=>{
  const refs = {'link[rel="icon"]': { href,
    getAttribute(k){return this.href},setAttribute(k,v){this.href=v}}}
  const appended=[]
  const doc={
    querySelector:(key)=>refs[key]||null,
    createElement:()=>({values:{},setAttribute(k,v){this.values[k]=v}}),
    head:{appendChild(x){appended.push(x)}}
  }
  assert.equal(applyWikiBrandIcon({
    wiki_brand_icon_url:'/assets/frappe_cn_fix/branding/icons/wiki-v3.png',
    wiki_brand_apple_touch_icon_url:'/assets/frappe_cn_fix/branding/pwa/wiki/apple-touch-180-v1.png'
  },doc),true)
  assert.equal(appended.length,1)
  assert.equal(appended[0].values.sizes,'180x180')
  assert.equal(appended[0].values.href,'/assets/frappe_cn_fix/branding/pwa/wiki/apple-touch-180-v1.png')
})
}

test('production favicon branding preserves an existing customer Apple touch icon', () => {
  let href = '/assets/wiki/frontend/favicon.png?v=2'
  let appended = 0
  const custom = { href: '/files/company-apple.png' }
  const doc = {
    querySelector: (selector) => selector === 'link[rel="icon"]'
      ? { getAttribute: () => href, setAttribute: (_name, value) => { href = value } }
      : custom,
    createElement: () => { throw new Error('customer icon must not be replaced') },
    head: { appendChild: () => { appended++ } },
  }
  assert.equal(applyWikiBrandIcon({
    wiki_brand_icon_url: '/assets/frappe_cn_fix/branding/icons/wiki-v3.png',
    wiki_brand_apple_touch_icon_url: '/assets/frappe_cn_fix/branding/pwa/wiki/apple-touch-180-v1.png',
  }, doc), true)
  assert.equal(custom.href, '/files/company-apple.png')
  assert.equal(appended, 0)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import {applyWikiBrandIcon} from '../frontend/src/branding_icon.mjs'

test('Wiki may add iOS icon only after native icon replacement succeeds',()=>{
  const refs = {'link[rel="icon"]': { href:'/favicon.png?v=2',
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

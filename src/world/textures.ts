import * as THREE from 'three'
import type { BlockType } from '../engine/blocks'

/** Procedural 16×16 pixel-art textures, so the project ships no third-party art. */

type Face = 'top' | 'side' | 'bottom'
const S = 16

/** Base color per block, also used for UI swatches. */
export const BLOCK_COLOR: Record<BlockType, string> = {
  grass: '#5fa83a',
  dirt: '#7a5230',
  stone: '#8a8d91',
  cobble: '#77797d',
  wood: '#6b4a2b',
  planks: '#b08850',
  brick: '#a5462e',
  sand: '#dccb8e',
  glass: '#bfe6ff',
  leaves: '#3f8a2e',
  gold: '#f2c230',
  neon: '#b6ff3b',
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shade(hex: string, amount: number, alpha = 1) {
  const n = parseInt(hex.slice(1), 16)
  const f = 1 + amount
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)))
  return `rgba(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)},${alpha})`
}

type Painter = (ctx: CanvasRenderingContext2D, r: () => number) => void

const px = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
  ctx.fillStyle = color
  ctx.fillRect(x, y, 1, 1)
}

const noise =
  (base: string, spread: number): Painter =>
  (ctx, r) => {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) px(ctx, x, y, shade(base, (r() - 0.5) * spread))
  }

const dirt: Painter = (ctx, r) => {
  noise('#7a5230', 0.35)(ctx, r)
  for (let i = 0; i < 10; i++) px(ctx, (r() * S) | 0, (r() * S) | 0, shade('#5a3a20', 0))
}

const grassTop: Painter = (ctx, r) => {
  noise('#5fa83a', 0.3)(ctx, r)
  for (let i = 0; i < 14; i++) px(ctx, (r() * S) | 0, (r() * S) | 0, shade('#7cc94c', 0.1))
}

const grassSide: Painter = (ctx, r) => {
  dirt(ctx, r)
  for (let x = 0; x < S; x++) {
    const depth = 3 + ((r() * 3) | 0)
    for (let y = 0; y < depth; y++) px(ctx, x, y, shade('#5fa83a', (r() - 0.5) * 0.3))
  }
}

const stone: Painter = (ctx, r) => {
  noise('#8a8d91', 0.18)(ctx, r)
  for (let i = 0; i < 5; i++) {
    const x = (r() * 14) | 0
    const y = (r() * S) | 0
    for (let k = 0; k < 3; k++) px(ctx, x + k, y, shade('#6c6f73', 0))
  }
}

const cobble: Painter = (ctx, r) => {
  ctx.fillStyle = '#45474b'
  ctx.fillRect(0, 0, S, S)
  for (let y = 0; y < S; y += 4) {
    let x = -((r() * 3) | 0)
    while (x < S) {
      const w = 3 + ((r() * 4) | 0)
      const base = shade('#8c8f93', (r() - 0.5) * 0.3)
      for (let yy = y; yy < y + 3; yy++)
        for (let xx = Math.max(0, x); xx < Math.min(S, x + w - 1); xx++)
          px(ctx, xx, yy, yy === y ? shade('#a3a6aa', (r() - 0.5) * 0.15) : base)
      x += w
    }
  }
}

const woodSide: Painter = (ctx, r) => {
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) px(ctx, x, y, shade('#6b4a2b', (x % 4 === 0 ? -0.25 : 0) + (r() - 0.5) * 0.18))
}

const woodTop: Painter = (ctx, r) => {
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5)
      const edge = x === 0 || y === 0 || x === S - 1 || y === S - 1
      const base = edge ? '#5a3c22' : Math.floor(d) % 3 === 0 ? '#8a6638' : '#a88250'
      px(ctx, x, y, shade(base, (r() - 0.5) * 0.12))
    }
}

const planks: Painter = (ctx, r) => {
  for (let y = 0; y < S; y++) {
    const row = y >> 2
    const seam = (row * 7 + 3) % S
    for (let x = 0; x < S; x++) {
      const line = y % 4 === 3 || x === seam
      px(ctx, x, y, shade(line ? '#7d5f36' : '#b08850', (r() - 0.5) * 0.14))
    }
  }
}

const brick: Painter = (ctx, r) => {
  for (let y = 0; y < S; y++) {
    const offset = (y >> 2) % 2 === 0 ? 0 : 4
    for (let x = 0; x < S; x++) {
      const mortar = y % 4 === 3 || (x + offset) % 8 === 7
      px(ctx, x, y, mortar ? shade('#cfc6b8', (r() - 0.5) * 0.1) : shade('#a5462e', (r() - 0.5) * 0.25))
    }
  }
}

const glass: Painter = (ctx, r) => {
  ctx.clearRect(0, 0, S, S)
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const edge = x === 0 || y === 0 || x === S - 1 || y === S - 1
      if (edge) px(ctx, x, y, shade('#dff4ff', (r() - 0.5) * 0.1, 0.95))
      else px(ctx, x, y, shade('#bfe6ff', 0, 0.1))
    }
  for (let i = 0; i < 4; i++) px(ctx, 3 + i, 9 - i, 'rgba(255,255,255,0.7)')
  for (let i = 0; i < 3; i++) px(ctx, 9 + i, 6 - i, 'rgba(255,255,255,0.5)')
}

const leaves: Painter = (ctx, r) => {
  noise('#3f8a2e', 0.45)(ctx, r)
  for (let i = 0; i < 18; i++) px(ctx, (r() * S) | 0, (r() * S) | 0, '#24521a')
}

const gold: Painter = (ctx, r) => {
  noise('#f2c230', 0.15)(ctx, r)
  for (let i = 0; i < S; i++) {
    px(ctx, i, S - 1, '#b8871b')
    px(ctx, S - 1, i, '#b8871b')
    px(ctx, i, 0, '#ffe58a')
    px(ctx, 0, i, '#ffe58a')
  }
  for (let i = 0; i < 4; i++) px(ctx, 3 + i, 3, '#fff6c8')
  px(ctx, 3, 4, '#fff6c8')
}

const neon: Painter = (ctx) => {
  ctx.fillStyle = '#0e1a12'
  ctx.fillRect(0, 0, S, S)
  ctx.fillStyle = '#b6ff3b'
  ctx.fillRect(0, 0, S, 1)
  ctx.fillRect(0, S - 1, S, 1)
  ctx.fillRect(0, 0, 1, S)
  ctx.fillRect(S - 1, 0, 1, S)
  ctx.fillRect(4, 4, 8, 1)
  ctx.fillRect(4, 11, 8, 1)
  ctx.fillRect(4, 4, 1, 8)
  ctx.fillRect(11, 4, 1, 8)
  ctx.fillRect(7, 7, 2, 2)
}

const PAINTERS: Record<BlockType, Record<Face, Painter>> = {
  grass: { top: grassTop, side: grassSide, bottom: dirt },
  dirt: { top: dirt, side: dirt, bottom: dirt },
  stone: { top: stone, side: stone, bottom: stone },
  cobble: { top: cobble, side: cobble, bottom: cobble },
  wood: { top: woodTop, side: woodSide, bottom: woodTop },
  planks: { top: planks, side: planks, bottom: planks },
  brick: { top: brick, side: brick, bottom: brick },
  sand: { top: noise('#dccb8e', 0.12), side: noise('#dccb8e', 0.12), bottom: noise('#dccb8e', 0.12) },
  glass: { top: glass, side: glass, bottom: glass },
  leaves: { top: leaves, side: leaves, bottom: leaves },
  gold: { top: gold, side: gold, bottom: gold },
  neon: { top: neon, side: neon, bottom: neon },
}

const textureCache = new Map<string, THREE.CanvasTexture>()

export function blockTexture(type: BlockType, face: Face) {
  const id = `${type}:${face}`
  let tex = textureCache.get(id)
  if (tex) return tex
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = S
  const ctx = canvas.getContext('2d')!
  let seed = 0
  for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) | 0
  PAINTERS[type][face](ctx, mulberry32(seed))
  tex = new THREE.CanvasTexture(canvas)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestMipmapLinearFilter
  tex.colorSpace = THREE.SRGBColorSpace
  textureCache.set(id, tex)
  return tex
}

const materialCache = new Map<BlockType, THREE.Material[]>()

/** Six materials in BoxGeometry face order: +x, -x, +y, -y, +z, -z. */
export function blockMaterials(type: BlockType) {
  const cached = materialCache.get(type)
  if (cached) return cached
  const make = (face: Face) => {
    const map = blockTexture(type, face)
    if (type === 'neon')
      return new THREE.MeshLambertMaterial({ map, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 1.4 })
    if (type === 'glass') return new THREE.MeshLambertMaterial({ map, transparent: true, depthWrite: false })
    return new THREE.MeshLambertMaterial({ map })
  }
  const side = make('side')
  const mats = [side, side, make('top'), make('bottom'), side, side]
  materialCache.set(type, mats)
  return mats
}

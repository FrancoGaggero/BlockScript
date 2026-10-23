import { useMemo } from 'react'
import * as THREE from 'three'
import type { BlockType } from '../engine/blocks'
import { WORLD } from '../engine/blocks'
import { cellHandlers } from './pointer'
import { blockTexture } from './textures'

const SIZE = WORLD.maxX - WORLD.minX + 1
const CENTER = (WORLD.minX + WORLD.maxX) / 2

function tiled(type: BlockType, face: 'top' | 'side' | 'bottom', rx: number, ry: number) {
  const tex = blockTexture(type, face).clone()
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(rx, ry)
  tex.needsUpdate = true
  return new THREE.MeshLambertMaterial({ map: tex })
}

/** A box whose every face shows one texture tile per world unit. */
function Slab({ size, y, height, top, side }: { size: number; y: number; height: number; top: BlockType; side: BlockType }) {
  const mats = useMemo(() => {
    const s = tiled(side, 'side', size, height)
    return [s, s, tiled(top, 'top', size, size), tiled(side, 'bottom', size, size), s, s]
  }, [size, height, top, side])
  return (
    <mesh position={[CENTER, y, CENTER]} material={mats} receiveShadow castShadow>
      <boxGeometry args={[size, height, size]} />
    </mesh>
  )
}

const LABELS: [string, [number, number, number]][] = [
  ['N', [CENTER, -0.5, WORLD.minZ - 1.6]],
  ['S', [CENTER, -0.5, WORLD.maxZ + 1.6]],
  ['E', [WORLD.maxX + 1.6, -0.5, CENTER]],
  ['W', [WORLD.minX - 1.6, -0.5, CENTER]],
]

function compassMaterial(label: string) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'rgba(10,14,26,0.82)'
  ctx.fillRect(0, 0, 64, 64)
  ctx.fillStyle = '#b6ff3b'
  ctx.font = '800 38px "JetBrains Mono", monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, 32, 34)
  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  return new THREE.SpriteMaterial({ map, fog: false })
}

export function Island() {
  const handlers = useMemo(() => cellHandlers(false), [])
  const compass = useMemo(() => LABELS.map(([label, pos]) => [label, pos, compassMaterial(label)] as const), [])
  const grid = useMemo(() => {
    const g = new THREE.GridHelper(SIZE, SIZE, '#ffffff', '#ffffff')
    const mat = g.material as THREE.Material
    mat.transparent = true
    mat.opacity = 0.09
    mat.depthWrite = false
    return g
  }, [])

  return (
    <group>
      {/* The grass top is the only pickable ground surface (y = -0.5, so blocks sit on y = 0). */}
      <group {...handlers}>
        <Slab size={SIZE} y={-1} height={1} top="grass" side="grass" />
      </group>
      <Slab size={SIZE} y={-3} height={3} top="dirt" side="dirt" />
      <Slab size={SIZE - 6} y={-6} height={3} top="stone" side="stone" />
      <Slab size={SIZE - 14} y={-9} height={3} top="stone" side="cobble" />
      <primitive object={grid} position={[CENTER, -0.49, CENTER]} />
      {compass.map(([label, pos, material]) => (
        <sprite key={label} position={pos} scale={1.3} material={material} />
      ))}
    </group>
  )
}

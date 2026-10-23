import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { BLOCK_TYPES, parseKey, type BlockType } from '../engine/blocks'
import { spawnTimes, useWorld, world } from '../store/worldStore'
import { cellHandlers } from './pointer'
import { blockMaterials } from './textures'

const geometry = new THREE.BoxGeometry(1, 1, 1)
const DROP_MS = 420
const tmp = new THREE.Object3D()

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3
const easeOutBack = (t: number) => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2

/** Drop-in: the block falls from above and pops to full size. */
function writeMatrix(mesh: THREE.InstancedMesh, index: number, k: string, progress: number) {
  const [x, y, z] = parseKey(k)
  tmp.position.set(x, y + (1 - easeOutCubic(progress)) * 1.4, z)
  tmp.scale.setScalar(0.25 + 0.75 * easeOutBack(progress))
  tmp.updateMatrix()
  mesh.setMatrixAt(index, tmp.matrix)
}

function BlockLayer({ type }: { type: BlockType }) {
  const version = useWorld((s) => s.typeVersions[type])
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const keysRef = useRef<string[]>([])
  const animatingRef = useRef<number[]>([])
  const handlers = useMemo(() => cellHandlers(true), [])

  // Instanced meshes have a fixed capacity: grow it in powers of two as the layer fills up.
  const [capacity, setCapacity] = useState(256)
  const needed = world.byType[type].size
  if (needed > capacity) {
    let next = capacity
    while (next < needed) next *= 2
    setCapacity(next)
  }

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const keys = [...world.byType[type]]
    const now = performance.now()
    const animating: number[] = []
    keys.forEach((k, i) => {
      const t0 = spawnTimes.get(k)
      const progress = t0 === undefined ? 1 : Math.min(1, (now - t0) / DROP_MS)
      if (progress < 1) animating.push(i)
      writeMatrix(mesh, i, k, progress)
    })
    keysRef.current = keys
    animatingRef.current = animating
    mesh.count = keys.length
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [version, capacity, type])

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh || !animatingRef.current.length) return
    const now = performance.now()
    const keys = keysRef.current
    animatingRef.current = animatingRef.current.filter((i) => {
      const k = keys[i]
      const progress = Math.min(1, (now - (spawnTimes.get(k) ?? 0)) / DROP_MS)
      writeMatrix(mesh, i, k, progress)
      if (progress < 1) return true
      spawnTimes.delete(k)
      return false
    })
    mesh.instanceMatrix.needsUpdate = true
    // Picking tests this sphere first; recompute it from the settled positions, not the drop-in ones.
    if (!animatingRef.current.length) mesh.computeBoundingSphere()
  })

  return (
    <instancedMesh
      key={capacity}
      ref={meshRef}
      args={[geometry, blockMaterials(type), capacity]}
      castShadow={type !== 'glass'}
      receiveShadow
      renderOrder={type === 'glass' ? 1 : 0}
      frustumCulled={false}
      {...handlers}
    />
  )
}

export function Blocks() {
  return (
    <>
      {BLOCK_TYPES.map((t) => (
        <BlockLayer key={t} type={t} />
      ))}
    </>
  )
}

import * as THREE from 'three'
import { parseKey } from '../engine/blocks'

const tmp = new THREE.Object3D()

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3
const easeOutBack = (t: number) => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2

/**
 * Drop-in: at progress 0 the block hangs above its cell and small; at 1 it sits in place.
 * Shared by the live world and the Remotion replay so both animate the same way.
 */
export function writeBlockMatrix(mesh: THREE.InstancedMesh, index: number, k: string, progress: number) {
  const [x, y, z] = parseKey(k)
  tmp.position.set(x, y + (1 - easeOutCubic(progress)) * 1.4, z)
  tmp.scale.setScalar(0.25 + 0.75 * easeOutBack(progress))
  tmp.updateMatrix()
  mesh.setMatrixAt(index, tmp.matrix)
}

export const nextCapacity = (needed: number, start = 256) => {
  let c = start
  while (c < needed) c *= 2
  return c
}

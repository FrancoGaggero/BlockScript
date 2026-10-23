import { useMemo } from 'react'
import * as THREE from 'three'
import { useHover } from './pointer'

/** Wireframe cube on the cell the pointer would build into. */
export function Cursor() {
  const place = useHover((s) => s.place)
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02)), [])
  if (!place) return null
  return (
    <group position={place}>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#b6ff3b" />
      </lineSegments>
      <mesh>
        <boxGeometry args={[1.01, 1.01, 1.01]} />
        <meshBasicMaterial color="#b6ff3b" transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  )
}

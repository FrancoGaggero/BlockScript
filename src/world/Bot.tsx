import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type * as THREE from 'three'
import { useWorld } from '../store/worldStore'

const SHELL = '#eef1f5'
const DARK = '#2a2f3a'
const ACCENT = '#b6ff3b'

/** The little builder bot. It eases toward its grid cell, so each `move` step reads as a walk. */
export function Bot() {
  const group = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)

  useFrame((state, dt) => {
    const g = group.current
    const b = body.current
    if (!g || !b) return
    const { bot } = useWorld.getState()
    const k = 1 - Math.exp(-dt * 14)
    const dist = Math.hypot(bot.x - g.position.x, bot.y - g.position.y, bot.z - g.position.z)
    g.position.x += (bot.x - g.position.x) * k
    g.position.y += (bot.y - g.position.y) * k
    g.position.z += (bot.z - g.position.z) * k

    // Rotate the short way round.
    let d = -bot.facing * (Math.PI / 2) - g.rotation.y
    d = ((((d + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI
    g.rotation.y += d * k

    const t = state.clock.elapsedTime
    const walking = Math.min(1, dist * 4)
    b.position.y = Math.abs(Math.sin(t * 14)) * 0.08 * walking + Math.sin(t * 2.2) * 0.025
    b.rotation.z = Math.sin(t * 14) * 0.06 * walking
  })

  return (
    <group ref={group}>
      <group ref={body}>
        {[-0.13, 0.13].map((x) => (
          <mesh key={x} position={[x, -0.4, 0]} castShadow>
            <boxGeometry args={[0.14, 0.2, 0.14]} />
            <meshLambertMaterial color={DARK} />
          </mesh>
        ))}
        <mesh position={[0, -0.1, 0]} castShadow>
          <boxGeometry args={[0.52, 0.4, 0.38]} />
          <meshLambertMaterial color={SHELL} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[0.53, 0.05, 0.39]} />
          <meshLambertMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.4} />
        </mesh>
        {[-0.32, 0.32].map((x) => (
          <mesh key={x} position={[x, -0.1, 0]} castShadow>
            <boxGeometry args={[0.1, 0.3, 0.12]} />
            <meshLambertMaterial color={DARK} />
          </mesh>
        ))}
        <mesh position={[0, 0.27, 0]} castShadow>
          <boxGeometry args={[0.48, 0.34, 0.42]} />
          <meshLambertMaterial color={SHELL} />
        </mesh>
        {/* Front is -z, so facing north means looking toward -z. */}
        <mesh position={[0, 0.28, -0.215]}>
          <boxGeometry args={[0.38, 0.16, 0.02]} />
          <meshLambertMaterial color="#0b1020" />
        </mesh>
        {[-0.08, 0.08].map((x) => (
          <mesh key={x} position={[x, 0.28, -0.228]}>
            <boxGeometry args={[0.07, 0.07, 0.01]} />
            <meshBasicMaterial color={ACCENT} />
          </mesh>
        ))}
        <mesh position={[0, 0.52, 0]}>
          <boxGeometry args={[0.03, 0.16, 0.03]} />
          <meshLambertMaterial color={DARK} />
        </mesh>
        <mesh position={[0, 0.62, 0]}>
          <boxGeometry args={[0.08, 0.08, 0.08]} />
          <meshBasicMaterial color={ACCENT} />
        </mesh>
      </group>
    </group>
  )
}

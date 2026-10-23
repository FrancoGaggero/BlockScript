import { OrbitControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useWorld } from '../store/worldStore'

export const ORBIT_POS = new THREE.Vector3(22, 19, 22)
const TOP_POS = new THREE.Vector3(0.01, 44, 0.01)
const FOLLOW_OFFSET = new THREE.Vector3(7, 6.5, 7)
const TRANSITION_MS = 1400

/** Orbit controls plus scripted moves when `camera <mode>` changes. The user can always drag. */
export function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null)
  const mode = useWorld((s) => s.camera)
  const transitionUntil = useRef(0)
  const v = useMemo(() => ({ target: new THREE.Vector3(), prev: new THREE.Vector3(), pos: new THREE.Vector3() }), [])

  useEffect(() => {
    transitionUntil.current = performance.now() + TRANSITION_MS
  }, [mode])

  useFrame(({ camera }, dt) => {
    const c = controls.current
    if (!c) return
    const transitioning = performance.now() < transitionUntil.current
    const k = 1 - Math.exp(-dt * 4)
    const { bot } = useWorld.getState()

    if (mode === 'follow') {
      // Drag the camera along with the target so the user's chosen angle is kept.
      v.prev.copy(c.target)
      c.target.lerp(v.target.set(bot.x, bot.y, bot.z), k)
      camera.position.add(v.pos.subVectors(c.target, v.prev))
      if (transitioning) camera.position.lerp(v.pos.copy(c.target).add(FOLLOW_OFFSET), k)
    } else if (transitioning) {
      c.target.lerp(v.target.set(0, 0, 0), k)
      camera.position.lerp(mode === 'top' ? TOP_POS : ORBIT_POS, k)
    }
    c.update()
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={5}
      maxDistance={80}
      maxPolarAngle={Math.PI / 2.08}
    />
  )
}


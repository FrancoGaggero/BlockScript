import { Stars } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { TimeOfDay } from '../engine/ops'
import { useWorld } from '../store/worldStore'

interface Preset {
  sky: string
  hemiSky: string
  hemiGround: string
  hemi: number
  sunColor: string
  sun: number
  sunPos: [number, number, number]
}

const PRESETS: Record<TimeOfDay, Preset> = {
  day: { sky: '#9fd3ff', hemiSky: '#d6ecff', hemiGround: '#5b4a35', hemi: 1.6, sunColor: '#fff1d6', sun: 2.4, sunPos: [14, 26, 10] },
  sunset: { sky: '#f39a78', hemiSky: '#ffd0ae', hemiGround: '#4a3040', hemi: 1.1, sunColor: '#ffad66', sun: 2.0, sunPos: [28, 7, 6] },
  night: { sky: '#0b1030', hemiSky: '#4a5aa0', hemiGround: '#10101a', hemi: 0.55, sunColor: '#9fb4ff', sun: 0.7, sunPos: [-12, 22, -10] },
}
const RAIN_TINT = new THREE.Color('#6f7b8a')

/** Sky color, fog and lights, all easing toward the preset for the current time and weather. */
export function Atmosphere() {
  const time = useWorld((s) => s.time)
  const weather = useWorld((s) => s.weather)
  const scene = useThree((s) => s.scene)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const sun = useRef<THREE.DirectionalLight>(null)

  const sky = useMemo(() => new THREE.Color(PRESETS.day.sky), [])
  useEffect(() => {
    scene.background = sky
    const fog = new THREE.Fog(sky, 40, 110)
    fog.color = sky // share the instance so the fog follows the sky as it eases
    scene.fog = fog
  }, [scene, sky])

  const target = useMemo(() => new THREE.Color(), [])
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, dt) => {
    const p = PRESETS[time]
    const rain = weather === 'rain'
    const k = 1 - Math.exp(-dt * 2.5)
    target.set(p.sky)
    if (rain) target.lerp(RAIN_TINT, time === 'night' ? 0.3 : 0.6)
    sky.lerp(target, k)
    if (hemi.current && sun.current) {
      hemi.current.color.lerp(target.set(p.hemiSky), k)
      hemi.current.groundColor.lerp(target.set(p.hemiGround), k)
      hemi.current.intensity += (p.hemi * (rain ? 0.75 : 1) - hemi.current.intensity) * k
      sun.current.color.lerp(target.set(p.sunColor), k)
      sun.current.intensity += (p.sun * (rain ? 0.4 : 1) - sun.current.intensity) * k
      sun.current.position.lerp(tmp.set(...p.sunPos), k)
    }
  })

  return (
    <>
      <hemisphereLight ref={hemi} args={[PRESETS.day.hemiSky, PRESETS.day.hemiGround, PRESETS.day.hemi]} />
      <directionalLight
        ref={sun}
        position={PRESETS.day.sunPos}
        intensity={PRESETS.day.sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-bias={-0.0005}
      />
      {time === 'night' && <Stars radius={90} depth={40} count={2500} factor={4} fade speed={0.6} />}
      {weather === 'rain' && <Rain />}
    </>
  )
}

const DROPS = 1400

function Rain() {
  const geo = useMemo(() => {
    const pos = new Float32Array(DROPS * 6)
    for (let i = 0; i < DROPS; i++) {
      const [x, y, z] = [Math.random() * 44 - 22, Math.random() * 34, Math.random() * 44 - 22]
      pos.set([x, y, z, x, y + 0.45, z], i * 6)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [])

  useFrame((_, dt) => {
    const attr = geo.attributes.position as THREE.BufferAttribute
    const pos = attr.array as Float32Array
    const fall = Math.min(dt, 0.05) * 26
    for (let i = 0; i < DROPS; i++) {
      const o = i * 6
      let y = pos[o + 1] - fall
      if (y < -0.5) y += 34
      pos[o + 1] = y
      pos[o + 4] = y + 0.45
    }
    attr.needsUpdate = true
  })

  return (
    <lineSegments geometry={geo} frustumCulled={false}>
      <lineBasicMaterial color="#cfe0ff" transparent opacity={0.55} />
    </lineSegments>
  )
}

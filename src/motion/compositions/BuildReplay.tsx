import { useThree } from '@react-three/fiber'
import { ThreeCanvas } from '@remotion/three'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import * as THREE from 'three'
import { BLOCK_TYPES, type BlockType } from '../../engine/blocks'
import { nextCapacity, writeBlockMatrix } from '../../world/blockMatrix'
import { Island } from '../../world/Island'
import { blockMaterials } from '../../world/textures'
import { IsoCube } from '../IsoCube'
import { C, DISPLAY, MONO } from '../theme'
import { replayTiming, type BuildReplayProps } from './replayConfig'

const DROP_FRAMES = 9
const geometry = new THREE.BoxGeometry(1, 1, 1)
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

interface Entry {
  k: string
  /** Index in the log of the change that placed it; -1 for blocks from the base world. */
  i: number
}

/** World after the first `count` changes, grouped by block type. */
function stateAt(base: BuildReplayProps['base'], log: BuildReplayProps['log'], count: number) {
  const cells = new Map<string, { block: BlockType; i: number }>()
  for (const [k, block] of base) cells.set(k, { block, i: -1 })
  for (let i = 0; i < count; i++) {
    const [k, block] = log[i]
    if (block) cells.set(k, { block, i })
    else cells.delete(k)
  }
  const byType = Object.fromEntries(BLOCK_TYPES.map((t) => [t, [] as Entry[]])) as Record<BlockType, Entry[]>
  for (const [k, { block, i }] of cells) byType[block].push({ k, i })
  return { byType, size: cells.size }
}

function ReplayLayer({ type, entries, progressOf }: { type: BlockType; entries: Entry[]; progressOf: (i: number) => number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const capacity = nextCapacity(entries.length, 64)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    entries.forEach((e, idx) => writeBlockMatrix(mesh, idx, e.k, e.i < 0 ? 1 : progressOf(e.i)))
    mesh.count = entries.length
    mesh.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh
      key={capacity}
      ref={ref}
      args={[geometry, blockMaterials(type), capacity]}
      castShadow={type !== 'glass'}
      receiveShadow
      renderOrder={type === 'glass' ? 1 : 0}
      frustumCulled={false}
    />
  )
}

/** Slow orbit that eases in a little as the build completes. */
function ReplayCamera({ frame, total }: { frame: number; total: number }) {
  const camera = useThree((s) => s.camera)
  useLayoutEffect(() => {
    const t = frame / total
    const angle = 0.55 + t * 1.3
    const radius = interpolate(t, [0, 1], [40, 31], { easing: Easing.inOut(Easing.cubic) })
    camera.position.set(Math.cos(angle) * radius, interpolate(t, [0, 1], [26, 19]), Math.sin(angle) * radius)
    camera.lookAt(0, 2, 0)
  }, [camera, frame, total])
  return null
}

/** Timelapse of the user's session, rendered from the same op log the console produced. */
export function BuildReplay({ base, log }: BuildReplayProps) {
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()
  const t = replayTiming(log.length)
  const progress = interpolate(frame, [t.intro, t.intro + t.build], [0, 1], { ...clamp, easing: Easing.inOut(Easing.sin) })
  const count = Math.floor(progress * log.length)
  const state = useMemo(() => stateAt(base, log, count), [base, log, count])

  // The frame at which change i lands, inverted through the same easing as `progress`.
  const progressOf = (i: number) => {
    const landsAt = interpolate((i + 1) / log.length, [0, 1], [t.intro, t.intro + t.build], {
      easing: (x) => Math.acos(1 - 2 * x) / Math.PI,
    })
    return Math.min(1, Math.max(0, (frame - landsAt) / DROP_FRAMES))
  }

  const outro = spring({ frame: frame - (t.intro + t.build + 8), fps, config: { damping: 14 } })

  return (
    <AbsoluteFill style={{ background: '#9fd3ff', fontFamily: MONO }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 40, near: 0.1, far: 300 }}>
        <color attach="background" args={['#9fd3ff']} />
        <fog attach="fog" args={['#9fd3ff', 50, 120]} />
        <hemisphereLight args={['#d6ecff', '#5b4a35', 1.6]} />
        <directionalLight
          position={[14, 26, 10]}
          intensity={2.4}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-26}
          shadow-camera-right={26}
          shadow-camera-top={26}
          shadow-camera-bottom={-26}
          shadow-camera-far={90}
          shadow-bias={-0.0005}
        />
        <ReplayCamera frame={frame} total={t.total} />
        <Island />
        {BLOCK_TYPES.map((type) => (
          <ReplayLayer key={type} type={type} entries={state.byType[type]} progressOf={progressOf} />
        ))}
      </ThreeCanvas>

      <div
        style={{
          position: 'absolute',
          top: 32,
          left: 36,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          opacity: interpolate(frame, [0, 12], [0, 1], clamp),
          translate: `0 ${interpolate(frame, [0, 12], [-16, 0], clamp)}px`,
        }}
      >
        <IsoCube color={C.accent} size={40} />
        <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 34, color: C.ink, letterSpacing: '-0.02em' }}>
          block<span style={{ background: C.ink, color: C.white, padding: '0 8px', marginLeft: 3 }}>script</span>
        </span>
        <span style={{ fontSize: 18, fontWeight: 800, color: C.ink, letterSpacing: '0.2em', marginLeft: 6 }}>REPLAY</span>
      </div>

      <div style={{ position: 'absolute', left: 36, right: 36, bottom: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontSize: 44, fontWeight: 800, color: C.white, textShadow: `3px 3px 0 ${C.ink}`, fontVariantNumeric: 'tabular-nums' }}>
            {state.size}
          </span>
          <span style={{ fontSize: 20, fontWeight: 800, color: C.white, textShadow: `2px 2px 0 ${C.ink}` }}>bloques</span>
          <span style={{ flex: 1 }} />
          <span
            style={{
              fontSize: 22,
              fontWeight: 800,
              padding: '8px 14px',
              background: C.accent,
              color: C.ink,
              boxShadow: `5px 5px 0 ${C.ink}`,
              opacity: outro,
              translate: `0 ${(1 - outro) * 30}px`,
            }}
          >
            hecho con código
          </span>
        </div>
        <div style={{ height: 8, background: 'rgba(10,14,26,0.35)' }}>
          <div style={{ width: `${progress * 100}%`, height: '100%', background: C.accent }} />
        </div>
      </div>
    </AbsoluteFill>
  )
}

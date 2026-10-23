import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { BlockType } from '../../engine/blocks'
import { BLOCK_COLOR } from '../../world/textures'
import { IsoCube } from '../IsoCube'
import { C, DISPLAY, MONO } from '../theme'

export type AchievementCardProps = {
  title: string
  description: string
  block: BlockType
}

export const ACHIEVEMENT_CARD = { width: 760, height: 200, fps: 30, durationInFrames: 105 } as const

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/** "Achievement unlocked" card: slides in, the cube pops, the title types itself, a shine sweeps across. */
export function AchievementCard({ title, description, block }: AchievementCardProps) {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()
  const enter = spring({ frame, fps, config: { damping: 15, stiffness: 150 } })
  const exit = interpolate(frame, [durationInFrames - 14, durationInFrames], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) })
  const cube = spring({ frame: frame - 6, fps, config: { damping: 8, stiffness: 160 } })
  const typed = Math.floor(interpolate(frame, [16, 36], [0, title.length], clamp))

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'flex-end', padding: 16 }}>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          width: 700,
          height: 150,
          padding: '0 32px',
          overflow: 'hidden',
          background: C.panel,
          border: `2px solid ${C.accent}`,
          boxShadow: `10px 10px 0 ${C.ink}`,
          translate: `${interpolate(enter, [0, 1], [760, 0]) + exit * 760}px 0`,
        }}
      >
        <div style={{ scale: cube, rotate: `${interpolate(cube, [0, 1], [-40, 0])}deg`, flexShrink: 0 }}>
          <IsoCube color={BLOCK_COLOR[block]} size={96} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 18,
              fontWeight: 800,
              color: C.accent,
              letterSpacing: `${interpolate(frame, [4, 22], [0.7, 0.2], { ...clamp, easing: Easing.out(Easing.cubic) })}em`,
              opacity: interpolate(frame, [4, 10], [0, 1], clamp),
            }}
          >
            ★ LOGRO DESBLOQUEADO
          </span>
          <span style={{ fontFamily: DISPLAY, fontSize: 46, fontWeight: 700, color: C.white, whiteSpace: 'nowrap' }}>
            {title.slice(0, typed)}
            <span style={{ opacity: typed < title.length && frame % 10 < 5 ? 1 : 0, color: C.accent }}>▌</span>
          </span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 20,
              color: C.text,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              opacity: interpolate(frame, [30, 42], [0, 1], clamp),
              translate: `0 ${interpolate(frame, [30, 42], [10, 0], clamp)}px`,
            }}
          >
            {description}
          </span>
        </div>
        <div
          style={{
            position: 'absolute',
            top: -40,
            bottom: -40,
            width: 90,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)',
            rotate: '18deg',
            left: `${interpolate(frame, [38, 58], [-20, 120], clamp)}%`,
          }}
        />
      </div>
    </AbsoluteFill>
  )
}

import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { classify, type TokenKind } from '../../console/highlight'
import { C, MONO } from '../theme'

export type CommandBurstProps = {
  input: string
  placed: number
  removed: number
}

export const BURST = { width: 1200, height: 300, fps: 30, durationInFrames: 60 } as const

const KIND_COLOR: Record<TokenKind, string> = {
  cmd: C.accent,
  bad: C.red,
  num: C.violet,
  block: C.amber,
  sep: C.muted,
  ws: C.text,
  text: C.white,
}

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/** Kinetic echo of the command that just ran: tokens pop in one by one, then a count-up. */
export function CommandBurst({ input, placed, removed }: CommandBurstProps) {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()
  const tokens = classify(input).filter((t) => t.kind !== 'ws')
  const count = placed || removed
  const fontSize = Math.min(60, Math.floor(1040 / (0.62 * (input.length + 2))))

  const enter = spring({ frame, fps, config: { damping: 16, stiffness: 190 } })

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', fontFamily: MONO }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 10,
          padding: '26px 40px',
          background: C.panel,
          borderLeft: `10px solid ${C.accent}`,
          boxShadow: `12px 12px 0 ${C.ink}`,
          scale: interpolate(enter, [0, 1], [0.85, 1]),
          translate: `0 ${interpolate(frame, [durationInFrames - 12, durationInFrames], [0, -40], { ...clamp, easing: Easing.in(Easing.cubic) })}px`,
          opacity: interpolate(frame, [0, 4, durationInFrames - 10, durationInFrames], [0, 1, 1, 0], clamp),
        }}
      >
        <div style={{ display: 'flex', gap: '0.5em', fontSize, fontWeight: 800, whiteSpace: 'nowrap' }}>
          <span style={{ color: C.accent }}>›</span>
          {tokens.map((t, i) => {
            const s = spring({ frame: frame - 3 - i * 2, fps, config: { damping: 11, stiffness: 210 } })
            return (
              <span
                key={i}
                style={{ color: KIND_COLOR[t.kind], display: 'inline-block', opacity: s, translate: `0 ${(1 - s) * 44}px` }}
              >
                {t.part}
              </span>
            )
          })}
        </div>
        {count > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 16,
              color: removed && !placed ? C.red : C.accent,
              opacity: interpolate(frame, [8, 14], [0, 1], clamp),
            }}
          >
            <span style={{ fontSize: 72, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
              {placed ? '+' : '−'}
              {Math.round(interpolate(frame, [10, 32], [0, count], { ...clamp, easing: Easing.out(Easing.cubic) }))}
            </span>
            <span style={{ fontSize: 28, color: C.muted, fontWeight: 600 }}>{count === 1 ? 'bloque' : 'bloques'}</span>
          </div>
        )}
      </div>
    </AbsoluteFill>
  )
}

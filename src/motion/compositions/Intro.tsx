import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { C, MONO, shadeHex } from '../theme'

export type IntroProps = {
  subtitle: string
  command: string
}

export const INTRO = { fps: 30, durationInFrames: 120, width: 1920, height: 1080 } as const

/** 5-row pixel glyphs; '#' is a block. */
const GLYPHS: Record<string, string[]> = {
  B: ['###.', '#..#', '###.', '#..#', '###.'],
  L: ['#...', '#...', '#...', '#...', '####'],
  O: ['.##.', '#..#', '#..#', '#..#', '.##.'],
  C: ['.###', '#...', '#...', '#...', '.###'],
  K: ['#..#', '#.#.', '##..', '#.#.', '#..#'],
  S: ['.###', '#...', '.##.', '...#', '###.'],
  R: ['###.', '#..#', '###.', '#.#.', '#..#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  P: ['###.', '#..#', '###.', '#...', '#...'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
}

interface Pixel {
  col: number
  row: number
  color: string
}

/** Lays out "BLOCKSCRIPT" as pixels: "BLOCK" in white, "SCRIPT" in the accent. */
function layoutWord() {
  const pixels: Pixel[] = []
  let col = 0
  ;[...'BLOCKSCRIPT'].forEach((letter, li) => {
    const glyph = GLYPHS[letter]
    glyph.forEach((line, row) =>
      [...line].forEach((ch, x) => ch === '#' && pixels.push({ col: col + x, row, color: li < 5 ? C.white : C.accent })),
    )
    col += glyph[0].length + 1
  })
  return { pixels, cols: col - 1 }
}

const WORD = layoutWord()
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/** Deterministic per-pixel jitter, so every render drops the blocks the same way. */
const jitter = (i: number) => ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1

/** Opening: the logo assembles from falling blocks, a prompt types `help`, then it all lifts away. */
export function Intro({ subtitle, command }: IntroProps) {
  const frame = useCurrentFrame()
  const { fps, width, height, durationInFrames } = useVideoConfig()
  const px = Math.floor(Math.min((width * 0.8) / WORD.cols, height / 14))
  const revealStart = durationInFrames - 26

  const subtitleChars = Math.floor(interpolate(frame, [46, 68], [0, subtitle.length], clamp))
  const commandChars = Math.floor(interpolate(frame, [72, 84], [0, command.length], clamp))

  return (
    <AbsoluteFill style={{ fontFamily: MONO }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 40%, #151b2e 0%, ${C.ink} 70%)`,
          opacity: interpolate(frame, [revealStart, durationInFrames - 4], [1, 0], clamp),
        }}
      />
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          gap: px * 1.4,
          scale: interpolate(frame, [revealStart, durationInFrames], [1, 1.2], { ...clamp, easing: Easing.in(Easing.cubic) }),
          opacity: interpolate(frame, [revealStart, durationInFrames - 4], [1, 0], clamp),
          filter: `blur(${interpolate(frame, [revealStart, durationInFrames], [0, 14], clamp)}px)`,
        }}
      >
        <div style={{ position: 'relative', width: WORD.cols * px, height: 5 * px }}>
          {WORD.pixels.map((p, i) => {
            const delay = p.col * 0.55 + p.row * 0.9 + jitter(i) * 5
            const s = spring({ frame: frame - delay, fps, config: { damping: 11, stiffness: 140, mass: 0.6 } })
            const bevel = Math.max(2, Math.round(px * 0.18))
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: p.col * px,
                  top: p.row * px,
                  width: px,
                  height: px,
                  background: p.color,
                  boxShadow: `inset -${bevel}px -${bevel}px 0 ${shadeHex(p.color, 0.62)}, inset ${bevel / 2}px ${bevel / 2}px 0 ${shadeHex(p.color, 1.15)}`,
                  opacity: frame >= delay ? 1 : 0,
                  translate: `0 ${(1 - s) * -height * 0.45}px`,
                }}
              />
            )
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px * 0.5 }}>
          <span style={{ fontSize: px * 1.1, color: C.muted, minHeight: px * 1.4 }}>{subtitle.slice(0, subtitleChars)}</span>
          <span
            style={{
              fontSize: px * 1.2,
              fontWeight: 800,
              color: C.white,
              opacity: interpolate(frame, [70, 74], [0, 1], clamp),
            }}
          >
            <span style={{ color: C.accent }}>› </span>
            <span style={{ color: C.accent }}>{command.slice(0, commandChars)}</span>
            <span style={{ color: C.accent, opacity: frame % 16 < 8 ? 1 : 0 }}>▌</span>
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

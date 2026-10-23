import type { BlockType } from '../../engine/blocks'

/** Kept apart from BuildReplay.tsx so the app can lazy-load the 3D replay. */

export type BuildReplayProps = {
  /** World at the start of the session. */
  base: [string, BlockType][]
  /** Every block change since, in order; null means removed. */
  log: [string, BlockType | null][]
}

export const REPLAY = { fps: 30, width: 1280, height: 720 } as const

/** Builds play for 3–10 s depending on size, framed by a short intro and a hold. */
export function replayTiming(changes: number) {
  const build = Math.min(300, Math.max(90, Math.ceil(changes / 3)))
  return { intro: 20, build, hold: 75, total: 20 + build + 75 }
}

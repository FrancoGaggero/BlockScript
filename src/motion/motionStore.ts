import { create } from 'zustand'
import type { Achievement } from '../achievements/achievements'
import type { BuildReplayProps } from './compositions/replayConfig'
import type { CommandBurstProps } from './compositions/CommandBurst'

interface MotionStore {
  introDone: boolean
  /** The burst currently on screen; a new id remounts the Player so it restarts. */
  burst: { id: number; props: CommandBurstProps } | null
  achievementQueue: Achievement[]
  replay: BuildReplayProps | null
  finishIntro(): void
  showBurst(props: CommandBurstProps): void
  clearBurst(id: number): void
  queueAchievement(a: Achievement): void
  shiftAchievement(): void
  openReplay(props: BuildReplayProps): void
  closeReplay(): void
}

let burstId = 0

export const useMotion = create<MotionStore>((set, get) => ({
  introDone: false,
  burst: null,
  achievementQueue: [],
  replay: null,
  finishIntro: () => set({ introDone: true }),
  showBurst: (props) => set({ burst: { id: ++burstId, props } }),
  clearBurst: (id) => get().burst?.id === id && set({ burst: null }),
  queueAchievement: (a) => set({ achievementQueue: [...get().achievementQueue, a] }),
  shiftAchievement: () => set({ achievementQueue: get().achievementQueue.slice(1) }),
  openReplay: (replay) => set({ replay }),
  closeReplay: () => set({ replay: null }),
}))

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

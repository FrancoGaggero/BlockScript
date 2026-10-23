import type { Achievement } from '../achievements/achievements'
import type { BlockType } from '../engine/blocks'

/** Typed app-wide events. The motion-graphics layer subscribes here to react to the console. */
export interface AppEvents {
  /** One line submitted to the prompt, possibly several `;`-separated commands. */
  inputSubmitted: { input: string; commands: number }
  commandExecuted: {
    input: string
    command: string
    placed: number
    removed: number
    moved: number
    placedByType: Partial<Record<BlockType, number>>
  }
  commandFailed: { input: string; message: string }
  achievementUnlocked: { achievement: Achievement }
}

type Handler<T> = (payload: T) => void
const handlers = new Map<keyof AppEvents, Set<Handler<never>>>()

export function on<K extends keyof AppEvents>(event: K, handler: Handler<AppEvents[K]>) {
  let set = handlers.get(event)
  if (!set) handlers.set(event, (set = new Set()))
  set.add(handler)
  return () => void set.delete(handler)
}

export function emit<K extends keyof AppEvents>(event: K, payload: AppEvents[K]) {
  handlers.get(event)?.forEach((h) => (h as Handler<AppEvents[K]>)(payload))
}

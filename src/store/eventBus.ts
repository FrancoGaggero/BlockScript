/** Typed app-wide events. The motion-graphics layer subscribes here to react to the console. */
export interface AppEvents {
  commandExecuted: { input: string; placed: number; removed: number; moved: number }
  commandFailed: { input: string; message: string }
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

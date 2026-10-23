import type { Op } from './ops'

export interface PlayHandlers {
  /** Called once per animation frame with the ops that became due. */
  apply(ops: Op[]): void
  done(): void
}

/** Whole builds take about this long regardless of size, so big fills stay snappy. */
const BUILD_BUDGET_MS = 2400
const BOT_STEP_MS = 170

/**
 * Replays ops over time. Each op waits its cost before it is applied, so a build
 * reads as blocks dropping in one after another rather than appearing at once.
 */
export function play(ops: Op[], handlers: PlayHandlers) {
  const blockOps = ops.filter((o) => o.type === 'place' || o.type === 'remove').length
  const blockCost = blockOps ? Math.min(60, Math.max(1, BUILD_BUDGET_MS / blockOps)) : 0
  const cost = (op: Op) =>
    op.type === 'place' || op.type === 'remove' ? blockCost : op.type === 'bot' ? BOT_STEP_MS : op.type === 'wait' ? op.ms : 0

  let i = 0
  let acc = 0
  let last = performance.now()
  let raf = 0

  const frame = (now: number) => {
    acc += Math.min(now - last, 100)
    last = now
    const due: Op[] = []
    while (i < ops.length && acc >= cost(ops[i])) {
      acc -= cost(ops[i])
      due.push(ops[i++])
    }
    if (due.length) handlers.apply(due)
    if (i < ops.length) raf = requestAnimationFrame(frame)
    else handlers.done()
  }
  raf = requestAnimationFrame(frame)
  return () => cancelAnimationFrame(raf)
}

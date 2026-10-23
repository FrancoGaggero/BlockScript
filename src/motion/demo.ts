import { runCommand } from '../console/dsl/commands'
import { key } from '../engine/blocks'
import type { BotState } from '../engine/ops'
import { seedWorld, VoxelWorld } from '../engine/voxelWorld'
import type { BuildReplayProps } from './compositions/replayConfig'

/** A little house built with real console commands, for previewing the replay in Studio. */
export const DEMO_SCRIPT = [
  'fill cobble -4 0 -4 4 0 4',
  'fill planks -4 1 -4 4 4 4 hollow',
  'fill air -1 1 4 0 2 4',
  'fill glass 2 2 4 3 3 4',
  'fill glass -3 2 4 -2 3 4',
  'fill brick -5 5 -5 5 5 5',
  'fill brick -4 6 -4 4 6 4',
  'fill brick -3 7 -3 3 7 3',
  'fill brick -1 8 -1 1 8 1',
  'place neon 0 9 0',
  'fill gold -1 0 6 0 0 9',
]

export function demoReplayProps(): BuildReplayProps {
  const world = new VoxelWorld()
  seedWorld(world)
  const base = [...world.blocks]
  const log: BuildReplayProps['log'] = []
  const bot: BotState = { x: 10, y: 0, z: 10, facing: 2 }
  for (const line of DEMO_SCRIPT) {
    for (const op of runCommand(line, { bot, get: (x, y, z) => world.get(x, y, z) }).ops) {
      if (op.type !== 'place' && op.type !== 'remove') continue
      const block = op.type === 'place' ? op.block : null
      world.set(op.x, op.y, op.z, block ?? undefined)
      log.push([key(op.x, op.y, op.z), block])
    }
  }
  return { base, log }
}

import { create } from 'zustand'
import { BLOCK_TYPES, key, type BlockType } from '../engine/blocks'
import type { BotState, CameraMode, Op, TimeOfDay, Weather } from '../engine/ops'
import { seedWorld, VoxelWorld } from '../engine/voxelWorld'

/** The voxel data lives outside React; the store only holds counters that tell layers to redraw. */
export const world = new VoxelWorld()
seedWorld(world)

/** The world as it was after the last reset, plus every block change since: the replay's source. */
const baseSnapshot: [string, BlockType][] = [...world.blocks]
const buildLog: [string, BlockType | null][] = []

export function replaySnapshot() {
  return { base: [...baseSnapshot], log: [...buildLog] }
}

/** key → performance.now() when the block appeared, read by the renderer for the drop-in animation. */
export const spawnTimes = new Map<string, number>()

interface Change {
  k: string
  before: BlockType | undefined
  after: BlockType | undefined
}

interface Tx {
  changes: Change[]
  botBefore: BotState
  botAfter: BotState
}

const START_BOT: BotState = { x: 0, y: 0, z: 0, facing: 2 }

type TypeVersions = Record<BlockType, number>
const zeroVersions = () => Object.fromEntries(BLOCK_TYPES.map((t) => [t, 0])) as TypeVersions

interface WorldStore {
  typeVersions: TypeVersions
  blockCount: number
  bot: BotState
  time: TimeOfDay
  weather: Weather
  camera: CameraMode
  busy: boolean
  undoStack: Tx[]
  redoStack: Tx[]
  setBusy(busy: boolean): void
  beginTx(): void
  applyOps(ops: Op[]): void
  /** Closes the open transaction; returns it when it changed anything. */
  commitTx(): Tx | null
  undo(): boolean
  redo(): boolean
  reset(): void
}

let openTx: Tx | null = null

function bump(versions: TypeVersions, dirty: Set<BlockType>) {
  if (!dirty.size) return versions
  const next = { ...versions }
  for (const t of dirty) next[t]++
  return next
}

/** Applies block changes directly (no transaction) and reports which types were touched. */
function writeBlocks(changes: Iterable<[string, BlockType | undefined]>, animate: boolean) {
  const dirty = new Set<BlockType>()
  const now = performance.now()
  for (const [k, block] of changes) {
    const prev = world.setKey(k, block)
    if (prev === block) continue
    buildLog.push([k, block ?? null])
    if (prev) dirty.add(prev)
    if (block) {
      dirty.add(block)
      if (animate) spawnTimes.set(k, now)
    }
  }
  return dirty
}

export const useWorld = create<WorldStore>((set, get) => ({
  typeVersions: zeroVersions(),
  blockCount: world.size,
  bot: START_BOT,
  time: 'day',
  weather: 'clear',
  camera: 'orbit',
  busy: false,
  undoStack: [],
  redoStack: [],

  setBusy: (busy) => set({ busy }),

  beginTx() {
    const bot = get().bot
    openTx = { changes: [], botBefore: bot, botAfter: bot }
  },

  applyOps(ops) {
    const blockWrites: [string, BlockType | undefined][] = []
    const patch: Partial<WorldStore> = {}
    for (const op of ops) {
      switch (op.type) {
        case 'place':
        case 'remove': {
          const k = key(op.x, op.y, op.z)
          const after = op.type === 'place' ? op.block : undefined
          const before = world.blocks.get(k)
          if (before === after) break
          openTx?.changes.push({ k, before, after })
          blockWrites.push([k, after])
          break
        }
        case 'bot':
          patch.bot = { x: op.x, y: op.y, z: op.z, facing: op.facing }
          if (openTx) openTx.botAfter = patch.bot
          break
        case 'time':
          patch.time = op.value
          break
        case 'weather':
          patch.weather = op.value
          break
        case 'camera':
          patch.camera = op.value
          break
      }
    }
    const dirty = writeBlocks(blockWrites, true)
    set({ ...patch, typeVersions: bump(get().typeVersions, dirty), blockCount: world.size })
  },

  commitTx() {
    const tx = openTx
    openTx = null
    if (!tx) return null
    const botMoved = tx.botBefore !== tx.botAfter
    if (!tx.changes.length && !botMoved) return null
    set({ undoStack: [...get().undoStack.slice(-99), tx], redoStack: [] })
    return tx
  },

  undo() {
    const tx = get().undoStack.at(-1)
    if (!tx) return false
    const dirty = writeBlocks(
      tx.changes.toReversed().map((c) => [c.k, c.before] as [string, BlockType | undefined]),
      true,
    )
    set({
      undoStack: get().undoStack.slice(0, -1),
      redoStack: [...get().redoStack, tx],
      bot: tx.botBefore,
      typeVersions: bump(get().typeVersions, dirty),
      blockCount: world.size,
    })
    return true
  },

  redo() {
    const tx = get().redoStack.at(-1)
    if (!tx) return false
    const dirty = writeBlocks(
      tx.changes.map((c) => [c.k, c.after] as [string, BlockType | undefined]),
      true,
    )
    set({
      redoStack: get().redoStack.slice(0, -1),
      undoStack: [...get().undoStack, tx],
      bot: tx.botAfter,
      typeVersions: bump(get().typeVersions, dirty),
      blockCount: world.size,
    })
    return true
  },

  reset() {
    world.clear()
    seedWorld(world)
    spawnTimes.clear()
    buildLog.length = 0
    baseSnapshot.splice(0, baseSnapshot.length, ...world.blocks)
    const versions = get().typeVersions
    set({
      typeVersions: bump(versions, new Set(BLOCK_TYPES)),
      blockCount: world.size,
      bot: START_BOT,
      time: 'day',
      weather: 'clear',
      camera: 'orbit',
      undoStack: [],
      redoStack: [],
    })
  },
}))

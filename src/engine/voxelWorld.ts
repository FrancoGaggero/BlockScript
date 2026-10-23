import { BLOCK_TYPES, key, type BlockType } from './blocks'

/** Plain voxel storage with a per-type index, so each render layer only walks its own blocks. */
export class VoxelWorld {
  readonly blocks = new Map<string, BlockType>()
  readonly byType = Object.fromEntries(BLOCK_TYPES.map((t) => [t, new Set<string>()])) as Record<
    BlockType,
    Set<string>
  >

  get size() {
    return this.blocks.size
  }

  get(x: number, y: number, z: number) {
    return this.blocks.get(key(x, y, z))
  }

  /** Sets (or removes, with `undefined`) a block and returns what was there before. */
  setKey(k: string, block: BlockType | undefined): BlockType | undefined {
    const prev = this.blocks.get(k)
    if (prev === block) return prev
    if (prev) this.byType[prev].delete(k)
    if (block) {
      this.blocks.set(k, block)
      this.byType[block].add(k)
    } else {
      this.blocks.delete(k)
    }
    return prev
  }

  set(x: number, y: number, z: number, block: BlockType | undefined) {
    return this.setKey(key(x, y, z), block)
  }

  clear() {
    this.blocks.clear()
    for (const t of BLOCK_TYPES) this.byType[t].clear()
  }
}

/** The starting scenery: a small tree and a couple of rocks. */
export function seedWorld(world: VoxelWorld) {
  const [tx, tz] = [-11, -11]
  for (let y = 0; y < 4; y++) world.set(tx, y, tz, 'wood')
  for (let y = 3; y < 6; y++) {
    const r = y === 5 ? 1 : 2
    for (let x = -r; x <= r; x++)
      for (let z = -r; z <= r; z++) {
        if (Math.abs(x) === r && Math.abs(z) === r) continue
        if (x === 0 && z === 0 && y < 4) continue
        world.set(tx + x, y, tz + z, 'leaves')
      }
  }
  world.set(9, 0, -12, 'cobble')
  world.set(10, 0, -12, 'stone')
  world.set(9, 0, -11, 'stone')
  world.set(9, 1, -12, 'stone')
}

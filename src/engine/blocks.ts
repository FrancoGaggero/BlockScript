export const BLOCK_TYPES = [
  'grass',
  'dirt',
  'stone',
  'cobble',
  'wood',
  'planks',
  'brick',
  'sand',
  'glass',
  'leaves',
  'gold',
  'neon',
] as const

export type BlockType = (typeof BLOCK_TYPES)[number]

export const isBlockType = (s: string): s is BlockType =>
  (BLOCK_TYPES as readonly string[]).includes(s)

/** Inclusive bounds of the buildable world (32 × 32 × 32). */
export const WORLD = { minX: -16, maxX: 15, minY: 0, maxY: 31, minZ: -16, maxZ: 15 } as const

export const inBounds = (x: number, y: number, z: number) =>
  x >= WORLD.minX && x <= WORLD.maxX && y >= WORLD.minY && y <= WORLD.maxY && z >= WORLD.minZ && z <= WORLD.maxZ

export const key = (x: number, y: number, z: number) => `${x},${y},${z}`

export const parseKey = (k: string): [number, number, number] => {
  const [x, y, z] = k.split(',').map(Number)
  return [x, y, z]
}

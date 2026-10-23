import { BLOCK_TYPES, inBounds, isBlockType, WORLD, type BlockType } from '../../engine/blocks'
import {
  FACING_NAME,
  FACING_VEC,
  type BotState,
  type CameraMode,
  type Facing,
  type LineTone,
  type Op,
  type TimeOfDay,
  type Weather,
} from '../../engine/ops'
import { closest } from './suggest'
import { CommandError, tokenize, type Token } from './tokenizer'

/** Read-only view of the world a command compiles against. */
export interface CommandContext {
  bot: BotState
  get(x: number, y: number, z: number): BlockType | undefined
}

export type MetaAction = 'undo' | 'redo' | 'reset' | 'clear'

export interface OutLine {
  text: string
  tone: LineTone
}

export interface CommandResult {
  ops: Op[]
  lines: OutLine[]
  meta?: MetaAction
}

export interface CommandDef {
  name: string
  aliases?: string[]
  usage: string
  summary: string
  examples?: string[]
  /** Autocomplete candidates for the argument at `index`. */
  hints?: (index: number) => readonly string[]
  run(args: Token[], ctx: CommandContext): CommandResult
}

const MAX_FILL = 32 * 32 * 32
const MAX_STEPS = 64

const result = (ops: Op[] = [], lines: OutLine[] = [], meta?: MetaAction): CommandResult => ({ ops, lines, meta })

// ── argument helpers ────────────────────────────────────────────────────────

function noExtra(args: Token[], max: number, usage: string) {
  if (args.length > max) throw new CommandError(`sobra "${args[max].raw}"`, `uso: ${usage}`)
}

function coord(args: Token[], i: number, base: number, axis: string, usage: string) {
  const t = args[i]
  if (!t) throw new CommandError(`falta la coordenada ${axis}`, `uso: ${usage}`)
  if (t.kind === 'number') return t.value
  if (t.kind === 'rel') return base + t.value
  throw new CommandError(`"${t.raw}" no es un número para ${axis}`, `uso: ${usage}`)
}

function coords3(args: Token[], i: number, bot: BotState, usage: string): [number, number, number] {
  return [coord(args, i, bot.x, 'x', usage), coord(args, i + 1, bot.y, 'y', usage), coord(args, i + 2, bot.z, 'z', usage)]
}

function ensureInBounds(x: number, y: number, z: number) {
  if (!inBounds(x, y, z))
    throw new CommandError(
      `(${x} ${y} ${z}) está fuera del mundo`,
      `x y z van de ${WORLD.minX} a ${WORLD.maxX}, y de ${WORLD.minY} a ${WORLD.maxY}`,
    )
}

function blockArg(t: Token | undefined, usage: string): BlockType | 'air' {
  if (!t) throw new CommandError('falta el bloque', `uso: ${usage}`)
  if (t.kind === 'word' && (t.value === 'air' || isBlockType(t.value))) return t.value as BlockType | 'air'
  const guess = closest(t.raw.toLowerCase(), [...BLOCK_TYPES, 'air'])
  throw new CommandError(`no conozco el bloque "${t.raw}"`, guess ? `¿quisiste decir "${guess}"?` : 'escribí blocks para ver la lista')
}

function countArg(t: Token | undefined, max: number, usage: string) {
  if (!t) return 1
  if (t.kind !== 'number' || t.value < 1) throw new CommandError(`"${t.raw}" tiene que ser un número positivo`, `uso: ${usage}`)
  return Math.min(t.value, max)
}

function oneOf<T extends string>(t: Token | undefined, options: readonly T[], what: string, usage: string): T {
  if (!t) throw new CommandError(`falta ${what}`, `opciones: ${options.join(', ')}`)
  if (t.kind === 'word' && (options as readonly string[]).includes(t.value)) return t.value as T
  const guess = closest(t.raw.toLowerCase(), options)
  throw new CommandError(`"${t.raw}" no es ${what} válido`, guess ? `¿quisiste decir "${guess}"?` : `uso: ${usage}`)
}

const frontOf = (bot: BotState): [number, number, number] => {
  const [dx, dz] = FACING_VEC[bot.facing]
  return [bot.x + dx, bot.y, bot.z + dz]
}

// ── directions ──────────────────────────────────────────────────────────────

const DIRECTIONS = ['north', 'south', 'east', 'west', 'forward', 'back', 'up', 'down'] as const
type Direction = (typeof DIRECTIONS)[number]
const DIR_ALIASES: Record<string, Direction> = { n: 'north', s: 'south', e: 'east', w: 'west', f: 'forward', b: 'back', u: 'up', d: 'down', backward: 'back' }
const COMPASS: Partial<Record<Direction, Facing>> = { north: 0, east: 1, south: 2, west: 3 }

function directionArg(t: Token | undefined, usage: string): Direction {
  if (t?.kind === 'word' && DIR_ALIASES[t.value]) return DIR_ALIASES[t.value]
  return oneOf(t, DIRECTIONS, 'una dirección', usage)
}

// ── commands ────────────────────────────────────────────────────────────────

const TIMES = ['day', 'sunset', 'night'] as const satisfies readonly TimeOfDay[]
const WEATHERS = ['clear', 'rain'] as const satisfies readonly Weather[]
const CAMERAS = ['orbit', 'top', 'follow'] as const satisfies readonly CameraMode[]
const BLOCKS_AND_AIR = [...BLOCK_TYPES, 'air'] as const

export const COMMANDS: CommandDef[] = [
  {
    name: 'help',
    usage: 'help [comando]',
    summary: 'muestra los comandos o la ayuda de uno',
    hints: (i) => (i === 0 ? COMMANDS.map((c) => c.name) : []),
    run(args) {
      noExtra(args, 1, this.usage)
      if (args[0]) {
        const def = findCommand(args[0].raw.toLowerCase())
        if (!def) throw new CommandError(`no hay un comando "${args[0].raw}"`, 'escribí help para ver todos')
        const lines: OutLine[] = [
          { text: def.usage, tone: 'success' },
          { text: `  ${def.summary}`, tone: 'output' },
        ]
        if (def.aliases?.length) lines.push({ text: `  alias: ${def.aliases.join(', ')}`, tone: 'info' })
        for (const ex of def.examples ?? []) lines.push({ text: `  › ${ex}`, tone: 'hint' })
        return result([], lines)
      }
      const lines: OutLine[] = [{ text: 'comandos disponibles:', tone: 'info' }]
      for (const c of COMMANDS) lines.push({ text: `  ${c.usage.padEnd(38)}${c.summary}`, tone: 'output' })
      lines.push({ text: 'tips: ; separa comandos · ~ es la posición del bot · click en el mundo copia coordenadas', tone: 'hint' })
      return result([], lines)
    },
  },
  {
    name: 'blocks',
    usage: 'blocks',
    summary: 'lista los tipos de bloque',
    run(args) {
      noExtra(args, 0, this.usage)
      return result([], [{ text: `${BLOCK_TYPES.join('  ')}  (air borra)`, tone: 'output' }])
    },
  },
  {
    name: 'place',
    aliases: ['set', 'put'],
    usage: 'place <bloque> [x y z]',
    summary: 'pone un bloque (sin coordenadas: frente al bot)',
    examples: ['place stone 0 0 3', 'place gold', 'place glass ~ ~2 ~'],
    hints: (i) => (i === 0 ? BLOCKS_AND_AIR : []),
    run(args, ctx) {
      noExtra(args, 4, this.usage)
      const block = blockArg(args[0], this.usage)
      const [x, y, z] = args.length === 1 ? frontOf(ctx.bot) : coords3(args, 1, ctx.bot, this.usage)
      ensureInBounds(x, y, z)
      if (x === ctx.bot.x && y === ctx.bot.y && z === ctx.bot.z)
        throw new CommandError('el bot está parado ahí', 'movelo primero con move')
      if (block === 'air') return ctx.get(x, y, z) ? result([{ type: 'remove', x, y, z }]) : result()
      return result([{ type: 'place', x, y, z, block }])
    },
  },
  {
    name: 'fill',
    usage: 'fill <bloque> x1 y1 z1 x2 y2 z2 [hollow|outline]',
    summary: 'llena una caja entre dos esquinas',
    examples: ['fill brick -3 0 -3 3 3 3 hollow', 'fill air -5 0 -5 5 5 5', 'fill sand ~-2 ~ ~-2 ~2 ~ ~2'],
    hints: (i) => (i === 0 ? BLOCKS_AND_AIR : i === 7 ? ['hollow', 'outline'] : []),
    run(args, ctx) {
      noExtra(args, 8, this.usage)
      const block = blockArg(args[0], this.usage)
      const [x1, y1, z1] = coords3(args, 1, ctx.bot, this.usage)
      const [x2, y2, z2] = coords3(args, 4, ctx.bot, this.usage)
      const mode = args[7] ? oneOf(args[7], ['hollow', 'outline'] as const, 'un modo', this.usage) : 'solid'
      ensureInBounds(x1, y1, z1)
      ensureInBounds(x2, y2, z2)
      const [ax, bx] = [Math.min(x1, x2), Math.max(x1, x2)]
      const [ay, by] = [Math.min(y1, y2), Math.max(y1, y2)]
      const [az, bz] = [Math.min(z1, z2), Math.max(z1, z2)]
      const volume = (bx - ax + 1) * (by - ay + 1) * (bz - az + 1)
      if (volume > MAX_FILL) throw new CommandError(`la caja es demasiado grande (${volume} bloques)`)

      const ops: Op[] = []
      const { bot } = ctx
      // Bottom-up, so builds rise from the ground when replayed.
      for (let y = ay; y <= by; y++)
        for (let z = az; z <= bz; z++)
          for (let x = ax; x <= bx; x++) {
            if (x === bot.x && y === bot.y && z === bot.z) continue
            const shell = x === ax || x === bx || y === ay || y === by || z === az || z === bz
            if (!shell && mode === 'outline') continue
            const target = !shell && mode === 'hollow' ? 'air' : block
            const current = ctx.get(x, y, z)
            if (target === 'air') {
              if (current) ops.push({ type: 'remove', x, y, z })
            } else if (current !== target) {
              ops.push({ type: 'place', x, y, z, block: target })
            }
          }
      return result(ops, ops.length ? [] : [{ text: 'no había nada que cambiar', tone: 'info' }])
    },
  },
  {
    name: 'remove',
    aliases: ['break', 'dig'],
    usage: 'remove [x y z]',
    summary: 'saca un bloque (sin coordenadas: el de enfrente)',
    examples: ['remove 0 0 3', 'remove'],
    run(args, ctx) {
      noExtra(args, 3, this.usage)
      const [x, y, z] = args.length ? coords3(args, 0, ctx.bot, this.usage) : frontOf(ctx.bot)
      ensureInBounds(x, y, z)
      if (!ctx.get(x, y, z)) return result([], [{ text: `no hay ningún bloque en (${x} ${y} ${z})`, tone: 'warn' }])
      return result([{ type: 'remove', x, y, z }])
    },
  },
  {
    name: 'move',
    aliases: ['walk', 'go'],
    usage: 'move <dirección> [pasos]',
    summary: 'camina: north south east west forward back up down',
    examples: ['move north 3', 'move forward', 'move up 2'],
    hints: (i) => (i === 0 ? DIRECTIONS : []),
    run(args, ctx) {
      noExtra(args, 2, this.usage)
      const dir = directionArg(args[0], this.usage)
      const steps = countArg(args[1], MAX_STEPS, this.usage)
      let { x, y, z, facing } = ctx.bot
      const ops: Op[] = []
      const lines: OutLine[] = []
      const turnTo = COMPASS[dir]
      if (turnTo !== undefined && turnTo !== facing) {
        facing = turnTo
        ops.push({ type: 'bot', x, y, z, facing })
      }
      const [fx, fz] = FACING_VEC[facing]
      const [dx, dy, dz] =
        dir === 'up' ? [0, 1, 0] : dir === 'down' ? [0, -1, 0] : dir === 'back' ? [-fx, 0, -fz] : [fx, 0, fz]
      for (let i = 0; i < steps; i++) {
        const [nx, ny, nz] = [x + dx, y + dy, z + dz]
        if (!inBounds(nx, ny, nz)) {
          lines.push({ text: `el bot frenó en el borde del mundo después de ${i} paso(s)`, tone: 'warn' })
          break
        }
        const blocking = ctx.get(nx, ny, nz)
        if (blocking) {
          lines.push({ text: `hay ${blocking} en (${nx} ${ny} ${nz}); el bot frenó después de ${i} paso(s)`, tone: 'warn' })
          break
        }
        ;[x, y, z] = [nx, ny, nz]
        ops.push({ type: 'bot', x, y, z, facing })
      }
      return result(ops, lines)
    },
  },
  {
    name: 'turn',
    usage: 'turn <left|right|north|south|east|west>',
    summary: 'gira el bot',
    hints: (i) => (i === 0 ? ['left', 'right', 'north', 'south', 'east', 'west'] : []),
    run(args, ctx) {
      noExtra(args, 1, this.usage)
      const to = oneOf(args[0], ['left', 'right', 'north', 'south', 'east', 'west'] as const, 'un giro', this.usage)
      const { x, y, z, facing } = ctx.bot
      const next = (
        to === 'left' ? (facing + 3) % 4 : to === 'right' ? (facing + 1) % 4 : COMPASS[to]!
      ) as Facing
      return result([{ type: 'bot', x, y, z, facing: next }])
    },
  },
  {
    name: 'tp',
    aliases: ['teleport'],
    usage: 'tp x y z',
    summary: 'teletransporta al bot',
    run(args, ctx) {
      noExtra(args, 3, this.usage)
      const [x, y, z] = coords3(args, 0, ctx.bot, this.usage)
      ensureInBounds(x, y, z)
      const blocking = ctx.get(x, y, z)
      if (blocking) throw new CommandError(`en (${x} ${y} ${z}) hay ${blocking}`, 'elegí un lugar vacío')
      return result([{ type: 'bot', x, y, z, facing: ctx.bot.facing }])
    },
  },
  {
    name: 'pos',
    aliases: ['whereami'],
    usage: 'pos',
    summary: 'dice dónde está el bot',
    run(args, ctx) {
      noExtra(args, 0, this.usage)
      const { x, y, z, facing } = ctx.bot
      return result([], [{ text: `bot en (${x} ${y} ${z}) mirando al ${FACING_NAME[facing]}`, tone: 'info' }])
    },
  },
  {
    name: 'time',
    usage: 'time <day|sunset|night>',
    summary: 'cambia la hora del día',
    hints: (i) => (i === 0 ? TIMES : []),
    run(args) {
      noExtra(args, 1, this.usage)
      return result([{ type: 'time', value: oneOf(args[0], TIMES, 'una hora', this.usage) }])
    },
  },
  {
    name: 'weather',
    usage: 'weather <clear|rain>',
    summary: 'cambia el clima',
    hints: (i) => (i === 0 ? WEATHERS : []),
    run(args) {
      noExtra(args, 1, this.usage)
      return result([{ type: 'weather', value: oneOf(args[0], WEATHERS, 'un clima', this.usage) }])
    },
  },
  {
    name: 'camera',
    aliases: ['cam'],
    usage: 'camera <orbit|top|follow>',
    summary: 'cambia la cámara',
    hints: (i) => (i === 0 ? CAMERAS : []),
    run(args) {
      noExtra(args, 1, this.usage)
      return result([{ type: 'camera', value: oneOf(args[0], CAMERAS, 'una cámara', this.usage) }])
    },
  },
  { name: 'undo', usage: 'undo', summary: 'deshace el último comando', run: () => result([], [], 'undo') },
  { name: 'redo', usage: 'redo', summary: 'rehace lo deshecho', run: () => result([], [], 'redo') },
  { name: 'reset', usage: 'reset', summary: 'vuelve el mundo al inicio', run: () => result([], [], 'reset') },
  { name: 'clear', aliases: ['cls'], usage: 'clear', summary: 'limpia la consola', run: () => result([], [], 'clear') },
]

const ALL_NAMES = COMMANDS.flatMap((c) => [c.name, ...(c.aliases ?? [])])

export function findCommand(name: string) {
  return COMMANDS.find((c) => c.name === name || c.aliases?.includes(name))
}

export function isCommandName(word: string) {
  return ALL_NAMES.includes(word)
}

/** Compiles one command (no `;`) into ops. Throws CommandError on bad input. */
export function runCommand(input: string, ctx: CommandContext): CommandResult {
  const tokens = tokenize(input)
  if (!tokens.length) return result()
  const [head, ...args] = tokens
  if (head.kind !== 'word')
    throw new CommandError(`un comando empieza con una palabra, no con "${head.raw}"`, 'probá: help')
  const def = findCommand(head.value)
  if (!def) {
    const guess = closest(head.value, ALL_NAMES)
    throw new CommandError(`comando desconocido: ${head.raw}`, guess ? `¿quisiste decir "${guess}"?` : 'escribí help para ver los comandos')
  }
  return def.run(args, ctx)
}

/** Candidates that complete the last word of the prompt. */
export function complete(input: string): string[] {
  const segment = input.slice(input.lastIndexOf(';') + 1).trimStart()
  const words = segment.split(/\s+/)
  const partial = (words.pop() ?? '').toLowerCase()
  if (words.length === 0 && !partial) return []
  if (words.length === 0) return COMMANDS.map((c) => c.name).filter((n) => n.startsWith(partial) && n !== partial)
  const def = findCommand(words[0].toLowerCase())
  const options = def?.hints?.(words.length - 1) ?? []
  return options.filter((o) => o.startsWith(partial) && o !== partial)
}

import { BLOCK_TYPES, key, type BlockType } from '../../engine/blocks'
import { FACING_NAME, type BotState, type Op } from '../../engine/ops'
import { VoxelWorld } from '../../engine/voxelWorld'
import { runCommand } from '../dsl/commands'
import { CommandError } from '../dsl/tokenizer'

/** An op tagged with the line of user code that produced it, so the editor can follow along. */
export type ScriptOp = Op & { line?: number }

export interface ScriptInput {
  code: string
  base: [string, BlockType][]
  bot: BotState
}

export interface ScriptResult {
  ops: ScriptOp[]
  error?: { message: string; line?: number }
}

export const MAX_SCRIPT_OPS = 20_000

const SOURCE = 'script.js'
const LINE_RE = /script\.js:(\d+):\d+/

/** Names the user's code sees. The trailing ones shadow globals a script has no business touching. */
const PARAMS = ['world', 'bot', 'log', 'wait', 'time', 'weather', 'camera', 'BLOCKS']
const SHADOWED = ['self', 'globalThis', 'fetch', 'importScripts', 'XMLHttpRequest', 'WebSocket', 'postMessage', 'indexedDB', 'caches']

class ScriptLimitError extends Error {}

function compile(body: string) {
  // sourceURL names the code in stack traces, which is how API calls learn their line number.
  return new Function(...PARAMS, ...SHADOWED, `"use strict";\n${body}\n//# sourceURL=${SOURCE}`) as (
    ...args: unknown[]
  ) => unknown
}

let lineOffset: number | undefined

/** How many lines the Function wrapper adds before the user's first line (engine dependent). */
function getLineOffset() {
  if (lineOffset !== undefined) return lineOffset
  const stack = compile('return world()')(() => new Error().stack) as string | undefined
  const m = stack?.match(LINE_RE)
  return (lineOffset = m ? Number(m[1]) - 1 : 0)
}

const lineOf = (stack: string | undefined) => {
  const m = stack?.match(LINE_RE)
  return m ? Number(m[1]) - getLineOffset() : undefined
}

const describe = (v: unknown) => (typeof v === 'string' ? `'${v}'` : String(v))

function num(v: unknown, name: string, fn: string) {
  if (typeof v !== 'number' || !Number.isFinite(v))
    throw new TypeError(`${fn}: ${name} tiene que ser un número (llegó ${describe(v)})`)
  return Math.round(v)
}

function word(v: unknown, name: string, fn: string) {
  if (typeof v !== 'string' || !/^[a-z]+$/i.test(v))
    throw new TypeError(`${fn}: ${name} tiene que ser un texto como 'stone' (llegó ${describe(v)})`)
  return v.toLowerCase()
}

const format = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v) ?? String(v))

/**
 * Runs user JavaScript against a copy of the world and records what it did as ops.
 * Every API call is compiled through the same DSL commands, so rules and error messages match the console.
 */
export function runScript({ code, base, bot: startBot }: ScriptInput): ScriptResult {
  const sim = new VoxelWorld()
  for (const [k, b] of base) sim.setKey(k, b)
  let bot = { ...startBot }
  const ops: ScriptOp[] = []

  const push = (op: Op, line: number | undefined) => {
    if (ops.length >= MAX_SCRIPT_OPS)
      throw new ScriptLimitError(`el script generó más de ${MAX_SCRIPT_OPS} operaciones; achicá los loops`)
    ops.push({ ...op, line })
  }

  const exec = (command: string) => {
    const line = lineOf(new Error().stack)
    const res = runCommand(command, { bot, get: (x, y, z) => sim.get(x, y, z) })
    for (const l of res.lines) push({ type: 'log', text: l.text, tone: l.tone }, line)
    for (const op of res.ops) {
      if (op.type === 'place') sim.set(op.x, op.y, op.z, op.block)
      else if (op.type === 'remove') sim.set(op.x, op.y, op.z, undefined)
      else if (op.type === 'bot') bot = { x: op.x, y: op.y, z: op.z, facing: op.facing }
      push(op, line)
    }
  }

  const coords = (fn: string, ...vals: unknown[]) => vals.map((v, i) => num(v, 'xyz'[i % 3], fn)).join(' ')

  const world = Object.freeze({
    place(block: unknown, x?: unknown, y?: unknown, z?: unknown) {
      const b = word(block, 'el bloque', 'world.place')
      exec(x === undefined ? `place ${b}` : `place ${b} ${coords('world.place', x, y, z)}`)
    },
    fill(block: unknown, x1: unknown, y1: unknown, z1: unknown, x2: unknown, y2: unknown, z2: unknown, mode?: unknown) {
      const b = word(block, 'el bloque', 'world.fill')
      const m = mode === undefined ? '' : ` ${word(mode, 'el modo', 'world.fill')}`
      exec(`fill ${b} ${coords('world.fill', x1, y1, z1, x2, y2, z2)}${m}`)
    },
    remove(x?: unknown, y?: unknown, z?: unknown) {
      exec(x === undefined ? 'remove' : `remove ${coords('world.remove', x, y, z)}`)
    },
    get(x: unknown, y: unknown, z: unknown): BlockType | null {
      return sim.blocks.get(key(num(x, 'x', 'world.get'), num(y, 'y', 'world.get'), num(z, 'z', 'world.get'))) ?? null
    },
  })

  const botApi = Object.freeze({
    move(dir: unknown, steps: unknown = 1) {
      exec(`move ${word(dir, 'la dirección', 'bot.move')} ${num(steps, 'los pasos', 'bot.move')}`)
    },
    turn(dir: unknown) {
      exec(`turn ${word(dir, 'el giro', 'bot.turn')}`)
    },
    tp(x: unknown, y: unknown, z: unknown) {
      exec(`tp ${coords('bot.tp', x, y, z)}`)
    },
    place(block: unknown) {
      exec(`place ${word(block, 'el bloque', 'bot.place')}`)
    },
    pos() {
      return { x: bot.x, y: bot.y, z: bot.z, facing: FACING_NAME[bot.facing] }
    },
  })

  const log = (...args: unknown[]) => push({ type: 'log', text: args.map(format).join(' '), tone: 'output' }, lineOf(new Error().stack))
  const wait = (ms: unknown) => push({ type: 'wait', ms: Math.min(5000, Math.max(0, num(ms, 'ms', 'wait'))) }, lineOf(new Error().stack))
  const setting = (name: string) => (value: unknown) => exec(`${name} ${word(value, 'el valor', name)}`)

  try {
    getLineOffset()
    compile(code)(world, botApi, log, wait, setting('time'), setting('weather'), setting('camera'), [...BLOCK_TYPES])
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    const message =
      err instanceof CommandError
        ? err.message + (err.hint ? ` (${err.hint})` : '')
        : err instanceof ScriptLimitError
          ? err.message
          : `${err.name}: ${err.message}`
    return { ops, error: { message, line: lineOf(err.stack) } }
  }
  return { ops }
}

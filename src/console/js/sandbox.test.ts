import { describe, expect, it } from 'vitest'
import type { BotState } from '../../engine/ops'
import { MAX_SCRIPT_OPS, runScript } from './sandbox'

const bot: BotState = { x: 10, y: 0, z: 10, facing: 2 }
const run = (code: string) => runScript({ code, base: [], bot })

describe('runScript', () => {
  it('records ops from a loop, tagged with their source line', () => {
    const res = run(`// tower
for (let y = 0; y < 5; y++) {
  world.place('stone', 0, y, 0)
}`)
    expect(res.error).toBeUndefined()
    expect(res.ops).toHaveLength(5)
    expect(res.ops.every((o) => o.type === 'place' && o.line === 3)).toBe(true)
  })

  it('lets world.get see blocks placed earlier in the same script', () => {
    const res = run(`world.place('gold', 1, 0, 1)
log(world.get(1, 0, 1), world.get(2, 0, 2))`)
    expect(res.ops.at(-1)).toMatchObject({ type: 'log', text: 'gold null', line: 2 })
  })

  it('moves the bot and reports its position', () => {
    const res = run(`bot.move('north', 2)
const p = bot.pos()
log(p.x, p.z, p.facing)`)
    expect(res.ops.at(-1)).toMatchObject({ type: 'log', text: '10 8 north' })
  })

  it('returns console errors with the failing line and keeps earlier ops', () => {
    const res = run(`world.place('stone', 0, 0, 0)
world.place('stone', 99, 0, 0)`)
    expect(res.ops).toHaveLength(1)
    expect(res.error).toMatchObject({ line: 2 })
    expect(res.error?.message).toMatch(/fuera del mundo/)
  })

  it('explains bad argument types', () => {
    expect(run(`world.place(3, 0, 0, 0)`).error?.message).toMatch(/world\.place: el bloque/)
    expect(run(`world.place('stone', 'a', 0, 0)`).error?.message).toMatch(/x tiene que ser un número/)
  })

  it('reports runtime errors from user code with their line', () => {
    expect(run(`const a = 1\nnope()`).error).toMatchObject({ line: 2, message: expect.stringMatching(/ReferenceError/) })
  })

  it('stops runaway scripts at the op limit', () => {
    const res = run(`while (true) wait(0)`)
    expect(res.ops).toHaveLength(MAX_SCRIPT_OPS)
    expect(res.error?.message).toMatch(/más de/)
  })

  it('hides network globals from scripts', () => {
    expect(run(`log(typeof fetch, typeof globalThis)`).ops[0]).toMatchObject({ text: 'undefined undefined' })
  })
})

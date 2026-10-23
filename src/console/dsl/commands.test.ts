import { describe, expect, it } from 'vitest'
import { VoxelWorld } from '../../engine/voxelWorld'
import type { BotState } from '../../engine/ops'
import { complete, runCommand, type CommandContext } from './commands'
import { CommandError, tokenize } from './tokenizer'

function ctx(bot: Partial<BotState> = {}, world = new VoxelWorld()): CommandContext {
  return { bot: { x: 0, y: 0, z: 0, facing: 2, ...bot }, get: (x, y, z) => world.get(x, y, z) }
}

describe('tokenize', () => {
  it('splits words, integers and relative coordinates', () => {
    expect(tokenize('Place stone -3 ~ ~2').map((t) => [t.kind, t.value])).toEqual([
      ['word', 'place'],
      ['word', 'stone'],
      ['number', -3],
      ['rel', 0],
      ['rel', 2],
    ])
  })

  it('rejects malformed relative coordinates', () => {
    expect(() => tokenize('place stone ~x 0 0')).toThrow(CommandError)
  })
})

describe('runCommand', () => {
  it('place compiles to one op', () => {
    expect(runCommand('place gold 1 2 3', ctx()).ops).toEqual([{ type: 'place', x: 1, y: 2, z: 3, block: 'gold' }])
  })

  it('place without coordinates targets the cell in front of the bot', () => {
    expect(runCommand('place stone', ctx({ facing: 1 })).ops[0]).toMatchObject({ x: 1, y: 0, z: 0 })
  })

  it('resolves ~ relative to the bot', () => {
    expect(runCommand('place stone ~1 ~ ~-1', ctx({ x: 4, z: 4 })).ops[0]).toMatchObject({ x: 5, y: 0, z: 3 })
  })

  it('suggests close command and block names', () => {
    const err = (input: string) => {
      try {
        runCommand(input, ctx())
      } catch (e) {
        return e as CommandError
      }
      throw new Error('expected an error')
    }
    expect(err('plce stone 0 0 0').hint).toContain('place')
    expect(err('place stoen 0 0 0').hint).toContain('stone')
  })

  it('rejects out-of-bounds coordinates', () => {
    expect(() => runCommand('place stone 99 0 0', ctx())).toThrow(/fuera del mundo/)
  })

  it('fill builds bottom-up and skips the bot cell', () => {
    const ops = runCommand('fill stone -1 0 -1 1 1 1', ctx()).ops
    expect(ops).toHaveLength(17)
    const ys = ops.map((o) => (o.type === 'place' ? o.y : -1))
    expect(ys).toEqual([...ys].sort((a, b) => a - b))
  })

  it('fill hollow clears the interior', () => {
    const world = new VoxelWorld()
    world.set(5, 1, 5, 'dirt')
    const ops = runCommand('fill brick 4 0 4 6 2 6 hollow', ctx({}, world)).ops
    expect(ops).toContainEqual({ type: 'remove', x: 5, y: 1, z: 5 })
    expect(ops.filter((o) => o.type === 'place')).toHaveLength(26)
  })

  it('move turns, then walks and stops at obstacles', () => {
    const world = new VoxelWorld()
    world.set(3, 0, 0, 'stone')
    const res = runCommand('move east 5', ctx({}, world))
    expect(res.ops[0]).toEqual({ type: 'bot', x: 0, y: 0, z: 0, facing: 1 })
    expect(res.ops.at(-1)).toMatchObject({ x: 2, z: 0 })
    expect(res.lines[0].tone).toBe('warn')
  })

  it('meta commands do not produce ops', () => {
    expect(runCommand('undo', ctx())).toMatchObject({ ops: [], meta: 'undo' })
  })
})

describe('complete', () => {
  it('completes command names and their arguments', () => {
    expect(complete('fi')).toEqual(['fill'])
    expect(complete('place go')).toEqual(['gold'])
    expect(complete('move ')).toContain('north')
    expect(complete('time day; weather r')).toEqual(['rain'])
  })
})

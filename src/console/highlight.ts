import { isBlockType } from '../engine/blocks'
import { isCommandName } from './dsl/commands'

export type TokenKind = 'cmd' | 'bad' | 'num' | 'block' | 'sep' | 'ws' | 'text'

/** Splits a prompt into pieces tagged for highlighting: commands, numbers, block names. */
export function classify(text: string) {
  const out: { part: string; kind: TokenKind }[] = []
  let expectCommand = true
  for (const part of text.split(/(\s+|;)/)) {
    if (!part) continue
    const lower = part.toLowerCase()
    let kind: TokenKind = 'text'
    if (part === ';') kind = 'sep'
    else if (/^\s+$/.test(part)) kind = 'ws'
    else if (expectCommand) kind = isCommandName(lower) ? 'cmd' : 'bad'
    else if (/^~?-?\d*$/.test(part)) kind = 'num'
    else if (isBlockType(lower)) kind = 'block'
    if (kind !== 'ws') expectCommand = part === ';'
    out.push({ part, kind })
  }
  return out
}

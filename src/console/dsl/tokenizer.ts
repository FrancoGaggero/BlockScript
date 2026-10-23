export type Token =
  | { kind: 'word'; value: string; raw: string; pos: number }
  | { kind: 'number'; value: number; raw: string; pos: number }
  /** `~` or `~n`: a coordinate relative to the bot, like in sandbox games. */
  | { kind: 'rel'; value: number; raw: string; pos: number }

export class CommandError extends Error {
  readonly hint?: string
  constructor(message: string, hint?: string) {
    super(message)
    this.hint = hint
  }
}

const INT = /^-?\d+$/

export function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  const re = /\S+/g
  for (let m = re.exec(input); m; m = re.exec(input)) {
    const raw = m[0]
    const pos = m.index
    if (raw.startsWith('~')) {
      const rest = raw.slice(1)
      if (rest !== '' && !INT.test(rest)) throw new CommandError(`"${raw}" no es una coordenada relativa válida`, 'usá ~ o ~3 o ~-2')
      tokens.push({ kind: 'rel', value: rest === '' ? 0 : Number(rest), raw, pos })
    } else if (INT.test(raw)) {
      tokens.push({ kind: 'number', value: Number(raw), raw, pos })
    } else {
      tokens.push({ kind: 'word', value: raw.toLowerCase(), raw, pos })
    }
  }
  return tokens
}

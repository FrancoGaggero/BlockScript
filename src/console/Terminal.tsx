import { Fragment, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { BlockType } from '../engine/blocks'
import type { LineTone } from '../engine/ops'
import { submit } from '../engine/executor'
import { useTerminal } from '../store/terminalStore'
import { useWorld } from '../store/worldStore'
import { BLOCK_COLOR } from '../world/textures'
import { complete } from './dsl/commands'
import { classify } from './highlight'

const QUICK = ['help', 'place gold', 'move forward 3', 'fill brick -3 0 2 3 4 6 hollow', 'time night', 'replay', 'logros']

const WELCOME: [string, LineTone][] = [
  ['blockscript v0.1: un mundo que se programa', 'info'],
  ['escribí help para ver los comandos, o probá alguno de estos:', 'output'],
  ['  › fill brick -3 0 2 3 4 6 hollow', 'hint'],
  ['  › move east 4; place neon; turn left', 'hint'],
  ['  › time sunset; weather rain', 'hint'],
  ['click en el mundo copia coordenadas al prompt (shift+click: el bloque apuntado)', 'output'],
]

/** Colors commands, numbers and block names as the user types them. */
function Highlight({ text }: { text: string }) {
  return (
    <>
      {classify(text).map(({ part, kind }, i) =>
        kind === 'ws' ? (
          <Fragment key={i}>{part}</Fragment>
        ) : (
          <span
            key={i}
            className={`hl-${kind}`}
            style={kind === 'block' ? { ['--swatch' as string]: BLOCK_COLOR[part.toLowerCase() as BlockType] } : undefined}
          >
            {part}
          </span>
        ),
      )}
    </>
  )
}

export function Terminal() {
  const lines = useTerminal((s) => s.lines)
  const input = useTerminal((s) => s.input)
  const setInput = useTerminal((s) => s.setInput)
  const busy = useWorld((s) => s.busy)
  const [historyIndex, setHistoryIndex] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const term = useTerminal.getState()
    if (term.lines.length === 0) for (const [text, tone] of WELCOME) term.print(text, tone)
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [lines])

  const suggestions = useMemo(() => complete(input), [input])
  const partial = input.slice(input.search(/\S*$/))
  const ghost = suggestions[0]?.slice(partial.length) ?? ''

  const run = (text: string) => {
    submit(text)
    setInput('')
    setHistoryIndex(null)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const { history } = useTerminal.getState()
    if (e.key === 'Enter') {
      run(input)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      if (ghost) setInput(input + ghost + ' ')
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!history.length) return
      const i = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1)
      setHistoryIndex(i)
      setInput(history[i])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex === null) return
      const i = historyIndex + 1
      setHistoryIndex(i >= history.length ? null : i)
      setInput(i >= history.length ? '' : history[i])
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      useTerminal.getState().clear()
    }
  }

  return (
    <section className="terminal" onClick={() => window.getSelection()?.isCollapsed && inputRef.current?.focus()}>
      <header className="terminal-bar">
        <span className="dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="terminal-title">bot@isla: ~</span>
        <span className={`status ${busy ? 'is-busy' : ''}`}>{busy ? 'ejecutando' : 'listo'}</span>
      </header>

      <div className="terminal-scroll" ref={scrollRef} role="log" aria-live="polite">
        {lines.map((l) => {
          const example = l.tone === 'hint' && l.text.trimStart().startsWith('› ')
          return (
            <div
              key={l.id}
              className={`line tone-${l.tone} ${example ? 'is-example' : ''}`}
              onClick={example ? () => setInput(l.text.trimStart().slice(2)) : undefined}
            >
              {l.tone === 'input' ? (
                <>
                  <span className="prompt">›</span> <Highlight text={l.text} />
                </>
              ) : (
                l.text
              )}
            </div>
          )
        })}
      </div>

      <div className="terminal-input">
        <span className="prompt">›</span>
        <div className="input-wrap">
          <div className="input-mirror" aria-hidden>
            <Highlight text={input} />
            <span className="ghost">{ghost}</span>
          </div>
          <input
            id="term-input"
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setHistoryIndex(null)
            }}
            onKeyDown={onKeyDown}
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="Comando"
            placeholder="escribí un comando… (Tab autocompleta)"
          />
        </div>
      </div>

      {suggestions.length > 1 && (
        <div className="suggestions">
          {suggestions.slice(0, 8).map((s) => (
            <button key={s} onClick={() => setInput(input.slice(0, input.length - partial.length) + s + ' ')}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="quick" aria-label="Comandos rápidos">
        {QUICK.map((q) => (
          <button key={q} onClick={() => run(q)}>
            {q}
          </button>
        ))}
      </div>
    </section>
  )
}

import type { CompletionContext } from '@codemirror/autocomplete'
import { javascript, javascriptLanguage } from '@codemirror/lang-javascript'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorState, Prec, StateEffect, StateField, type Extension } from '@codemirror/state'
import { Decoration, EditorView, keymap, type DecorationSet } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'
import { basicSetup } from 'codemirror'
import { useEffect, useRef } from 'react'
import { BLOCK_TYPES } from '../../engine/blocks'
import { submitScript } from '../../engine/executor'
import { useWorld } from '../../store/worldStore'
import { EXAMPLES } from './examples'
import { useScript } from './scriptStore'

// ── run / error line markers ───────────────────────────────────────────────

const setMarks = StateEffect.define<{ run: number | null; error: number | null }>()

const marks = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes)
    for (const e of tr.effects) {
      if (!e.is(setMarks)) continue
      const ranges = []
      const { doc } = tr.state
      const { run, error } = e.value
      if (error && error <= doc.lines) ranges.push(Decoration.line({ class: 'cm-error-line' }).range(doc.line(error).from))
      if (run && run <= doc.lines && run !== error) ranges.push(Decoration.line({ class: 'cm-run-line' }).range(doc.line(run).from))
      deco = Decoration.set(ranges, true)
    }
    return deco
  },
  provide: (f) => EditorView.decorations.from(f),
})

// ── autocomplete for the blockscript API ───────────────────────────────────

const API: Record<'world' | 'bot', [string, string][]> = {
  world: [
    ['place', "(bloque, x, y, z)"],
    ['fill', "(bloque, x1, y1, z1, x2, y2, z2, 'hollow'?)"],
    ['remove', '(x, y, z)'],
    ['get', '(x, y, z) → bloque | null'],
  ],
  bot: [
    ['move', "(dirección, pasos = 1)"],
    ['turn', "('left' | 'right' | 'north' …)"],
    ['tp', '(x, y, z)'],
    ['place', '(bloque) frente al bot'],
    ['pos', '() → { x, y, z, facing }'],
  ],
}

const GLOBALS = [
  { label: 'world', type: 'variable', detail: 'el mundo' },
  { label: 'bot', type: 'variable', detail: 'el bot' },
  { label: 'log', type: 'function', detail: '(...valores)' },
  { label: 'wait', type: 'function', detail: '(ms)' },
  { label: 'time', type: 'function', detail: "('day' | 'sunset' | 'night')" },
  { label: 'weather', type: 'function', detail: "('clear' | 'rain')" },
  { label: 'camera', type: 'function', detail: "('orbit' | 'top' | 'follow')" },
  { label: 'BLOCKS', type: 'constant', detail: 'lista de bloques' },
]

const WORDS = [...BLOCK_TYPES, 'air', 'north', 'south', 'east', 'west', 'forward', 'back', 'up', 'down', 'left', 'right', 'hollow', 'outline']

function apiCompletions(ctx: CompletionContext) {
  const member = ctx.matchBefore(/\b(world|bot)\.\w*/)
  if (member) {
    const obj = member.text.split('.')[0] as 'world' | 'bot'
    return {
      from: member.from + obj.length + 1,
      options: API[obj].map(([label, detail]) => ({ label, detail, type: 'function', apply: `${label}(` })),
    }
  }
  const str = ctx.matchBefore(/['"][a-z]*/)
  if (str) return { from: str.from + 1, options: WORDS.map((label) => ({ label, type: 'constant' })) }
  const word = ctx.matchBefore(/\w+/)
  if (!word && !ctx.explicit) return null
  return { from: word?.from ?? ctx.pos, options: GLOBALS }
}

// ── look ───────────────────────────────────────────────────────────────────

const theme = EditorView.theme(
  {
    '&': { height: '100%', backgroundColor: 'var(--panel)', color: 'var(--text)', fontSize: '13px' },
    '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '1.6' },
    '.cm-content': { caretColor: 'var(--accent)' },
    '.cm-cursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
    '.cm-gutters': { backgroundColor: 'var(--panel)', color: '#4a5470', border: 'none' },
    '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.03)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--muted)' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: 'rgba(182,255,59,0.18) !important' },
    '.cm-matchingBracket': { backgroundColor: 'rgba(182,255,59,0.2)', outline: 'none' },
    '.cm-run-line': { backgroundColor: 'rgba(182,255,59,0.16)', boxShadow: 'inset 3px 0 0 var(--accent)' },
    '.cm-error-line': { backgroundColor: 'rgba(255,107,122,0.16)', boxShadow: 'inset 3px 0 0 var(--red)' },
    '.cm-tooltip': { backgroundColor: 'var(--panel-2)', border: '1px solid var(--line)' },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'rgba(182,255,59,0.18)', color: '#fff' },
    '.cm-completionDetail': { color: 'var(--muted)', fontStyle: 'normal', marginLeft: '1em' },
  },
  { dark: true },
)

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.definitionKeyword, t.moduleKeyword], color: '#5ee0ff' },
  { tag: [t.string, t.special(t.string)], color: '#ffcc66' },
  { tag: [t.number, t.bool, t.null], color: '#b99bff' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: '#5c6788', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#b6ff3b' },
  { tag: [t.propertyName], color: '#e6ecf8' },
  { tag: [t.variableName, t.definition(t.variableName)], color: '#c9d1e4' },
  { tag: [t.operator, t.punctuation, t.bracket], color: '#8b96b5' },
])

// ── component ──────────────────────────────────────────────────────────────

function runCurrent() {
  submitScript(useScript.getState().code)
  return true
}

function closeEditor() {
  useScript.getState().setOpen(false)
  requestAnimationFrame(() => document.getElementById('term-input')?.focus())
  return true
}

export function ScriptEditor() {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const busy = useWorld((s) => s.busy)

  useEffect(() => {
    const extensions: Extension[] = [
      basicSetup,
      javascript(),
      javascriptLanguage.data.of({ autocomplete: apiCompletions }),
      Prec.highest(keymap.of([{ key: 'Mod-Enter', run: runCurrent }])),
      keymap.of([{ key: 'Escape', run: closeEditor }]),
      marks,
      theme,
      syntaxHighlighting(highlight),
      EditorView.updateListener.of((u) => {
        if (!u.docChanged) return
        useScript.getState().setCode(u.state.doc.toString())
        if (useScript.getState().errorLine) useScript.getState().setErrorLine(null)
      }),
    ]
    const v = new EditorView({ parent: host.current!, state: EditorState.create({ doc: useScript.getState().code, extensions }) })
    view.current = v
    // Defer focus: when opened with Enter, that same keystroke would otherwise land in the editor.
    const focusTimer = setTimeout(() => v.focus())
    const unsubscribe = useScript.subscribe((s, prev) => {
      if (s.runLine !== prev.runLine || s.errorLine !== prev.errorLine)
        v.dispatch({ effects: setMarks.of({ run: s.runLine, error: s.errorLine }) })
    })
    return () => {
      clearTimeout(focusTimer)
      unsubscribe()
      v.destroy()
      view.current = null
    }
  }, [])

  const loadExample = (name: string) => {
    const example = EXAMPLES.find((e) => e.name === name)
    const v = view.current
    if (!example || !v) return
    v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: example.code } })
    v.focus()
  }

  return (
    <section className="script-editor" aria-label="Editor de JavaScript">
      <header className="script-bar">
        <span className="script-file">script.js</span>
        <select
          aria-label="Cargar un ejemplo"
          value=""
          onChange={(e) => loadExample(e.target.value)}
        >
          <option value="" disabled>
            ejemplos…
          </option>
          {EXAMPLES.map((e) => (
            <option key={e.name} value={e.name}>
              {e.name}
            </option>
          ))}
        </select>
        <span className="script-spacer" />
        <button className="script-run" onClick={runCurrent} disabled={busy}>
          ▶ run <kbd>ctrl+enter</kbd>
        </button>
        <button onClick={closeEditor} aria-label="Cerrar el editor">
          ✕ <kbd>esc</kbd>
        </button>
      </header>
      <div className="script-host" ref={host} />
    </section>
  )
}

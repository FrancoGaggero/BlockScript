import { create } from 'zustand'
import type { LineTone } from '../engine/ops'

export interface TermLine {
  id: number
  text: string
  tone: LineTone
}

interface TerminalStore {
  lines: TermLine[]
  input: string
  history: string[]
  print(text: string, tone?: LineTone): void
  clear(): void
  setInput(input: string): void
  /** Appends text to the prompt (used when clicking a block in the world). */
  insert(text: string): void
  pushHistory(entry: string): void
}

const MAX_LINES = 400
let nextId = 1

export const useTerminal = create<TerminalStore>((set, get) => ({
  lines: [],
  input: '',
  history: [],
  print(text, tone = 'output') {
    const lines = [...get().lines, ...text.split('\n').map((t) => ({ id: nextId++, text: t, tone }))]
    set({ lines: lines.slice(-MAX_LINES) })
  },
  clear: () => set({ lines: [] }),
  setInput: (input) => set({ input }),
  insert(text) {
    const input = get().input
    const sep = input && !input.endsWith(' ') ? ' ' : ''
    set({ input: input + sep + text })
  },
  pushHistory(entry) {
    const history = get().history.filter((h) => h !== entry)
    set({ history: [...history, entry].slice(-100) })
  },
}))

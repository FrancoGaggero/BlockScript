import { create } from 'zustand'
import { EXAMPLES } from './examples'

const STORAGE_KEY = 'blockscript:script'

function loadDraft() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? EXAMPLES[0].code
  } catch {
    return EXAMPLES[0].code
  }
}

interface ScriptStore {
  open: boolean
  code: string
  /** Line whose ops are being played right now. */
  runLine: number | null
  errorLine: number | null
  setOpen(open: boolean): void
  setCode(code: string): void
  setRunLine(line: number | null): void
  setErrorLine(line: number | null): void
}

export const useScript = create<ScriptStore>((set) => ({
  open: false,
  code: loadDraft(),
  runLine: null,
  errorLine: null,
  setOpen: (open) => set({ open }),
  setCode(code) {
    set({ code })
    try {
      localStorage.setItem(STORAGE_KEY, code)
    } catch {
      // The draft just won't survive a reload.
    }
  },
  setRunLine: (runLine) => set({ runLine }),
  setErrorLine: (errorLine) => set({ errorLine }),
}))

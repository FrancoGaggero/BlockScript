import type { ScriptInput, ScriptResult } from './sandbox'

const TIMEOUT_MS = 3000

/** Runs a script in a fresh worker; a script that never returns is terminated after the timeout. */
export function runInWorker(input: ScriptInput): Promise<ScriptResult> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./sandbox.worker.ts', import.meta.url), { type: 'module' })
    const done = (result: ScriptResult) => {
      clearTimeout(timer)
      worker.terminate()
      resolve(result)
    }
    const timer = setTimeout(
      () => done({ ops: [], error: { message: `el script tardó más de ${TIMEOUT_MS / 1000} s y lo frené. ¿Hay un loop infinito?` } }),
      TIMEOUT_MS,
    )
    worker.onmessage = (e: MessageEvent<ScriptResult>) => done(e.data)
    worker.onerror = (e) => done({ ops: [], error: { message: e.message || 'el worker falló' } })
    worker.postMessage(input)
  })
}

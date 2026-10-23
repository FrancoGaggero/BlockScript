import { runScript, type ScriptInput } from './sandbox'

// Runs off the main thread so an infinite loop can be killed with worker.terminate().
const ctx = self as unknown as { onmessage: (e: MessageEvent<ScriptInput>) => void; postMessage(message: unknown): void }

ctx.onmessage = (e) => ctx.postMessage(runScript(e.data))

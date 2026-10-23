import { runCommand, type CommandResult } from '../console/dsl/commands'
import { CommandError } from '../console/dsl/tokenizer'
import { emit } from '../store/eventBus'
import { useTerminal } from '../store/terminalStore'
import { useWorld, world } from '../store/worldStore'
import type { LineTone } from './ops'
import { play } from './player'

/** Commands typed while a build is still animating wait here. */
const queue: string[] = []
let running = false

const print = (text: string, tone?: LineTone) => useTerminal.getState().print(text, tone)

export function submit(raw: string) {
  const input = raw.trim()
  if (!input) return
  const term = useTerminal.getState()
  term.print(input, 'input')
  term.pushHistory(input)
  for (const part of input.split(';')) if (part.trim()) queue.push(part.trim())
  pump()
}

function pump() {
  if (running) return
  const input = queue.shift()
  const store = useWorld.getState()
  if (input === undefined) {
    store.setBusy(false)
    return
  }
  running = true
  store.setBusy(true)

  let res: CommandResult
  try {
    // Compile against the world as it is now, after earlier queued commands finished.
    res = runCommand(input, { bot: store.bot, get: (x, y, z) => world.get(x, y, z) })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    print(`✗ ${message}`, 'error')
    if (e instanceof CommandError && e.hint) print(`  ${e.hint}`, 'hint')
    if (queue.length) print(`  se cancelaron ${queue.length} comando(s) siguientes`, 'hint')
    queue.length = 0
    emit('commandFailed', { input, message })
    return finish()
  }

  for (const line of res.lines) print(line.text, line.tone)
  if (res.meta) {
    runMeta(res.meta)
    return finish()
  }
  if (!res.ops.length) return finish()

  store.beginTx()
  play(res.ops, {
    apply(ops) {
      for (const op of ops) if (op.type === 'log') print(op.text, op.tone)
      useWorld.getState().applyOps(ops)
    },
    done() {
      const tx = useWorld.getState().commitTx()
      const placed = tx?.changes.filter((c) => c.after).length ?? 0
      const removed = tx?.changes.filter((c) => !c.after).length ?? 0
      const moved = res.ops.filter((o) => o.type === 'bot').length
      const parts = [placed && `+${placed} bloque${placed === 1 ? '' : 's'}`, removed && `−${removed}`].filter(Boolean)
      if (parts.length) print(`✓ ${parts.join('  ')}`, 'success')
      emit('commandExecuted', { input, placed, removed, moved })
      finish()
    },
  })
}

function finish() {
  running = false
  pump()
}

function runMeta(meta: NonNullable<CommandResult['meta']>) {
  const store = useWorld.getState()
  switch (meta) {
    case 'undo': {
      const ok = store.undo()
      print(ok ? '↶ deshecho' : 'no hay nada para deshacer', ok ? 'success' : 'warn')
      break
    }
    case 'redo': {
      const ok = store.redo()
      print(ok ? '↷ rehecho' : 'no hay nada para rehacer', ok ? 'success' : 'warn')
      break
    }
    case 'reset':
      store.reset()
      print('mundo reiniciado', 'success')
      break
    case 'clear':
      useTerminal.getState().clear()
      break
  }
}

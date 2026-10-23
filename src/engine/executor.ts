import { achievementList } from '../achievements/achievements'
import { runCommand, type CommandResult } from '../console/dsl/commands'
import { CommandError } from '../console/dsl/tokenizer'
import { emit } from '../store/eventBus'
import { useTerminal } from '../store/terminalStore'
import { replaySnapshot, useWorld, world } from '../store/worldStore'
import { useMotion } from '../motion/motionStore'
import type { BlockType } from './blocks'
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
  const parts = input.split(';').map((p) => p.trim()).filter(Boolean)
  queue.push(...parts)
  emit('inputSubmitted', { input, commands: parts.length })
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
  const command = res.command ?? ''
  const noChange = { input, command, placed: 0, removed: 0, moved: 0, placedByType: {} }
  if (res.meta) {
    runMeta(res.meta)
    emit('commandExecuted', noChange)
    return finish()
  }
  if (!res.ops.length) {
    emit('commandExecuted', noChange)
    return finish()
  }

  store.beginTx()
  play(res.ops, {
    apply(ops) {
      for (const op of ops) if (op.type === 'log') print(op.text, op.tone)
      useWorld.getState().applyOps(ops)
    },
    done() {
      const tx = useWorld.getState().commitTx()
      const placedByType: Partial<Record<BlockType, number>> = {}
      for (const c of tx?.changes ?? []) if (c.after) placedByType[c.after] = (placedByType[c.after] ?? 0) + 1
      const placed = tx?.changes.filter((c) => c.after).length ?? 0
      const removed = tx?.changes.filter((c) => !c.after).length ?? 0
      const moved = res.ops.filter((o) => o.type === 'bot').length
      const parts = [placed && `+${placed} bloque${placed === 1 ? '' : 's'}`, removed && `−${removed}`].filter(Boolean)
      if (parts.length) print(`✓ ${parts.join('  ')}`, 'success')
      emit('commandExecuted', { input, command, placed, removed, moved, placedByType })
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
    case 'replay': {
      const snapshot = replaySnapshot()
      if (!snapshot.log.length) {
        print('todavía no construiste nada: probá un fill y después replay', 'warn')
        break
      }
      useMotion.getState().openReplay(snapshot)
      print(`▶ replay de ${snapshot.log.length} cambios (Esc para cerrar)`, 'success')
      break
    }
    case 'achievements': {
      const list = achievementList()
      print(`logros: ${list.filter((a) => a.unlocked).length}/${list.length}`, 'info')
      for (const a of list) print(`  ${a.unlocked ? '★' : '·'} ${a.title.padEnd(20)}${a.description}`, a.unlocked ? 'success' : 'hint')
      break
    }
  }
}

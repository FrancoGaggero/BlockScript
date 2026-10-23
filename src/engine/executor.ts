import { achievementList } from '../achievements/achievements'
import { runCommand, type CommandResult } from '../console/dsl/commands'
import { CommandError } from '../console/dsl/tokenizer'
import { runInWorker } from '../console/js/runInWorker'
import type { ScriptOp } from '../console/js/sandbox'
import { useScript } from '../console/js/scriptStore'
import { useMotion } from '../motion/motionStore'
import { emit } from '../store/eventBus'
import { useTerminal } from '../store/terminalStore'
import { replaySnapshot, useWorld, world } from '../store/worldStore'
import type { BlockType } from './blocks'
import type { LineTone } from './ops'
import { play } from './player'

type Job = { kind: 'command'; input: string } | { kind: 'script'; code: string }

/** Commands and scripts submitted while a build is still animating wait here. */
const queue: Job[] = []
let running = false

const print = (text: string, tone?: LineTone) => useTerminal.getState().print(text, tone)

/** How a script run shows up in the burst and in achievement checks. */
const SCRIPT_INPUT = 'js ▶ script.js'

export function submit(raw: string) {
  const input = raw.trim()
  if (!input) return
  const term = useTerminal.getState()
  term.print(input, 'input')
  term.pushHistory(input)
  const parts = input.split(';').map((p) => p.trim()).filter(Boolean)
  queue.push(...parts.map((p) => ({ kind: 'command', input: p }) as const))
  emit('inputSubmitted', { input, commands: parts.length })
  pump()
}

export function submitScript(code: string) {
  const lines = code.split('\n').length
  print(`${SCRIPT_INPUT}  (${lines} línea${lines === 1 ? '' : 's'})`, 'input')
  queue.push({ kind: 'script', code })
  pump()
}

function pump() {
  if (running) return
  const job = queue.shift()
  if (!job) {
    useWorld.getState().setBusy(false)
    return
  }
  running = true
  useWorld.getState().setBusy(true)
  if (job.kind === 'script') void runScriptJob(job.code)
  else runCommandJob(job.input)
}

function finish() {
  running = false
  pump()
}

function runCommandJob(input: string) {
  const store = useWorld.getState()
  let res: CommandResult
  try {
    // Compile against the world as it is now, after earlier queued commands finished.
    res = runCommand(input, { bot: store.bot, get: (x, y, z) => world.get(x, y, z) })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    print(`✗ ${message}`, 'error')
    if (e instanceof CommandError && e.hint) print(`  ${e.hint}`, 'hint')
    abortQueue()
    emit('commandFailed', { input, message })
    return finish()
  }

  for (const line of res.lines) print(line.text, line.tone)
  const command = res.command ?? ''
  if (res.meta) runMeta(res.meta)
  if (res.meta || !res.ops.length) {
    emit('commandExecuted', { input, command, placed: 0, removed: 0, moved: 0, placedByType: {} })
    return finish()
  }
  playOps(res.ops, input, command)
}

async function runScriptJob(code: string) {
  const script = useScript.getState()
  script.setErrorLine(null)
  const { bot } = useWorld.getState()
  const res = await runInWorker({ code, base: [...world.blocks], bot })

  const reportError = () => {
    if (!res.error) return
    const { line, message } = res.error
    print(`✗ ${line ? `línea ${line}: ` : ''}${message}`, 'error')
    useScript.getState().setErrorLine(line ?? null)
    abortQueue()
  }

  if (!res.ops.length) {
    if (!res.error) print('el script terminó sin hacer cambios', 'info')
    reportError()
    emit('commandExecuted', { input: SCRIPT_INPUT, command: 'js', placed: 0, removed: 0, moved: 0, placedByType: {} })
    return finish()
  }
  playOps(res.ops, SCRIPT_INPUT, 'js', reportError)
}

/** Replays ops inside one undo transaction, then reports what changed. */
function playOps(ops: ScriptOp[], input: string, command: string, after?: () => void) {
  useWorld.getState().beginTx()
  play(ops, {
    apply(due) {
      for (const op of due) if (op.type === 'log') print(op.text, op.tone)
      useWorld.getState().applyOps(due)
      const line = (due.at(-1) as ScriptOp).line
      if (line !== undefined) useScript.getState().setRunLine(line)
    },
    done() {
      useScript.getState().setRunLine(null)
      const tx = useWorld.getState().commitTx()
      const placedByType: Partial<Record<BlockType, number>> = {}
      for (const c of tx?.changes ?? []) if (c.after) placedByType[c.after] = (placedByType[c.after] ?? 0) + 1
      const placed = tx?.changes.filter((c) => c.after).length ?? 0
      const removed = tx?.changes.filter((c) => !c.after).length ?? 0
      const moved = ops.filter((o) => o.type === 'bot').length
      const parts = [placed && `+${placed} bloque${placed === 1 ? '' : 's'}`, removed && `−${removed}`].filter(Boolean)
      if (parts.length) print(`✓ ${parts.join('  ')}`, 'success')
      after?.()
      emit('commandExecuted', { input, command, placed, removed, moved, placedByType })
      finish()
    },
  })
}

function abortQueue() {
  if (queue.length) print(`  se cancelaron ${queue.length} comando(s) siguientes`, 'hint')
  queue.length = 0
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
    case 'js':
      useScript.getState().setOpen(true)
      print('editor abierto: ctrl+enter ejecuta, esc vuelve a la consola', 'info')
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

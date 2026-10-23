import type { BlockType } from '../engine/blocks'
import { emit, on, type AppEvents } from '../store/eventBus'
import { useTerminal } from '../store/terminalStore'

export interface Achievement {
  id: string
  title: string
  description: string
  /** Block shown on the achievement card. */
  block: BlockType
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-block', title: 'Primer bloque', description: 'Pusiste tu primer bloque', block: 'grass' },
  { id: 'architect', title: 'Arquitecto', description: 'Construiste una caja hueca con fill hollow', block: 'brick' },
  { id: 'builder', title: 'Constructor', description: '300 bloques colocados', block: 'planks' },
  { id: 'gold-rush', title: 'Fiebre del oro', description: '20 bloques de oro', block: 'gold' },
  { id: 'explorer', title: 'Explorador', description: 'El bot caminó 25 pasos', block: 'sand' },
  { id: 'chain', title: 'Encadenador', description: 'Tres comandos en una línea con ;', block: 'cobble' },
  { id: 'night-owl', title: 'Noctámbulo', description: 'Hiciste de noche', block: 'neon' },
  { id: 'storm', title: 'Tormenta', description: 'Hiciste llover', block: 'glass' },
  { id: 'demolition', title: 'Demolición', description: '50 bloques removidos', block: 'stone' },
  { id: 'time-travel', title: 'Viaje en el tiempo', description: 'Usaste undo', block: 'wood' },
]

const STORAGE_KEY = 'blockscript:achievements'

function load(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

const unlocked = new Set<string>(load())
const stats = { placed: 0, removed: 0, steps: 0, gold: 0 }

function unlock(id: string) {
  if (unlocked.has(id)) return
  const achievement = ACHIEVEMENTS.find((a) => a.id === id)
  if (!achievement) return
  unlocked.add(id)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...unlocked]))
  } catch {
    // Storage can be unavailable (private mode); achievements then last for the session.
  }
  useTerminal.getState().print(`★ logro desbloqueado: ${achievement.title}`, 'success')
  emit('achievementUnlocked', { achievement })
}

function onCommand(e: AppEvents['commandExecuted']) {
  stats.placed += e.placed
  stats.removed += e.removed
  stats.steps += e.moved
  stats.gold += e.placedByType.gold ?? 0
  if (e.placed > 0) unlock('first-block')
  if (e.command === 'fill' && e.placed > 0 && /\bhollow\b/i.test(e.input)) unlock('architect')
  if (stats.placed >= 300) unlock('builder')
  if (stats.gold >= 20) unlock('gold-rush')
  if (stats.steps >= 25) unlock('explorer')
  if (stats.removed >= 50) unlock('demolition')
  if (e.command === 'time' && /\bnight\b/i.test(e.input)) unlock('night-owl')
  if (e.command === 'weather' && /\brain\b/i.test(e.input)) unlock('storm')
  if (e.command === 'undo') unlock('time-travel')
}

let initialized = false

export function initAchievements() {
  if (initialized) return
  initialized = true
  on('commandExecuted', onCommand)
  on('inputSubmitted', (e) => e.commands >= 3 && unlock('chain'))
}

export function achievementList() {
  return ACHIEVEMENTS.map((a) => ({ ...a, unlocked: unlocked.has(a.id) }))
}

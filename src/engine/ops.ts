import type { BlockType } from './blocks'

/** 0 = north (-z), 1 = east (+x), 2 = south (+z), 3 = west (-x) */
export type Facing = 0 | 1 | 2 | 3

export const FACING_VEC: Record<Facing, [number, number]> = {
  0: [0, -1],
  1: [1, 0],
  2: [0, 1],
  3: [-1, 0],
}

export const FACING_NAME: Record<Facing, string> = { 0: 'north', 1: 'east', 2: 'south', 3: 'west' }

export interface BotState {
  x: number
  y: number
  z: number
  facing: Facing
}

export type TimeOfDay = 'day' | 'sunset' | 'night'
export type Weather = 'clear' | 'rain'
export type CameraMode = 'orbit' | 'top' | 'follow'
export type LineTone = 'input' | 'output' | 'info' | 'success' | 'warn' | 'error' | 'hint'

/**
 * Everything the console can do to the world compiles down to a flat list of ops.
 * The player replays them over time, which is what makes builds animate step by step.
 */
export type Op =
  | { type: 'place'; x: number; y: number; z: number; block: BlockType }
  | { type: 'remove'; x: number; y: number; z: number }
  | { type: 'bot'; x: number; y: number; z: number; facing: Facing }
  | { type: 'time'; value: TimeOfDay }
  | { type: 'weather'; value: Weather }
  | { type: 'camera'; value: CameraMode }
  | { type: 'log'; text: string; tone?: LineTone }
  | { type: 'wait'; ms: number }

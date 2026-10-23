import type { ThreeEvent } from '@react-three/fiber'
import { create } from 'zustand'
import { inBounds } from '../engine/blocks'
import { useTerminal } from '../store/terminalStore'

type Cell = [number, number, number]

interface HoverStore {
  /** Empty cell next to the hovered face: where a block would go. */
  place: Cell | null
  /** The hovered block itself (null over the ground). */
  block: Cell | null
  set(place: Cell | null, block: Cell | null): void
}

export const useHover = create<HoverStore>((set) => ({
  place: null,
  block: null,
  set: (place, block) => set({ place, block }),
}))

const round3 = (x: number, y: number, z: number): Cell => [Math.round(x), Math.round(y), Math.round(z)]

/** Pointer handlers shared by the ground and every block layer. */
export function cellHandlers(isBlock: boolean) {
  return {
    onPointerMove(e: ThreeEvent<PointerEvent>) {
      e.stopPropagation()
      const n = e.face?.normal
      if (!n) return
      const p = e.point
      const place = round3(p.x + n.x * 0.5, p.y + n.y * 0.5, p.z + n.z * 0.5)
      const block = isBlock ? round3(p.x - n.x * 0.5, p.y - n.y * 0.5, p.z - n.z * 0.5) : null
      useHover.getState().set(inBounds(...place) ? place : null, block)
    },
    onPointerOut() {
      useHover.getState().set(null, null)
    },
    onClick(e: ThreeEvent<MouseEvent>) {
      e.stopPropagation()
      if (e.delta > 4) return // it was an orbit drag
      const { place, block } = useHover.getState()
      const cell = e.shiftKey && block ? block : place
      if (!cell) return
      useTerminal.getState().insert(cell.join(' '))
      document.getElementById('term-input')?.focus()
    },
  }
}

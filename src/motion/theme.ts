import { loadFont as loadDisplay } from '@remotion/google-fonts/SpaceGrotesk'
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono'

/** Compositions load their own fonts so they render the same in the app, Studio and a render. */
export const MONO = loadMono('normal', { weights: ['400', '600', '800'], subsets: ['latin'] }).fontFamily
export const DISPLAY = loadDisplay('normal', { weights: ['500', '700'], subsets: ['latin'] }).fontFamily

export const C = {
  ink: '#0a0e1a',
  panel: 'rgba(10, 14, 26, 0.9)',
  text: '#c9d1e4',
  muted: '#7a85a3',
  white: '#eef1f5',
  accent: '#b6ff3b',
  accentDim: '#6f9c22',
  violet: '#b99bff',
  amber: '#ffcc66',
  red: '#ff6b7a',
}

/** Shades a #rrggbb color by a factor (1 = unchanged). */
export function shadeHex(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16)
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)))
  return `rgb(${c((n >> 16) & 255)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`
}

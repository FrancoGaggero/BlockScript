import { shadeHex } from './theme'

/** A flat isometric cube in SVG: the brand mark, and the icon on achievement cards. */
export function IsoCube({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ display: 'block', overflow: 'visible' }}>
      <path d="M16 3 28 9.5 16 16 4 9.5Z" fill={shadeHex(color, 1.12)} />
      <path d="M4 9.5 16 16v13L4 22.5Z" fill={shadeHex(color, 0.78)} />
      <path d="M28 9.5 16 16v13l12-6.5Z" fill={shadeHex(color, 0.58)} />
      <path d="M16 3 28 9.5 16 16 4 9.5Z M4 9.5 16 16v13L4 22.5Z M28 9.5 16 16v13l12-6.5Z" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={0.6} strokeLinejoin="round" />
    </svg>
  )
}

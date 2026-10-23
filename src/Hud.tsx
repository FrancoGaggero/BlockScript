import { useEffect, useState } from 'react'
import { FACING_NAME } from './engine/ops'
import { on } from './store/eventBus'
import { useWorld } from './store/worldStore'
import { useHover } from './world/pointer'

interface Toast {
  id: number
  text: string
}

let toastId = 0

/** Overlay on the 3D stage: brand, live stats, pointer coordinates and command toasts. */
export function Hud() {
  const bot = useWorld((s) => s.bot)
  const blockCount = useWorld((s) => s.blockCount)
  const time = useWorld((s) => s.time)
  const place = useHover((s) => s.place)
  const block = useHover((s) => s.block)
  const [toasts, setToasts] = useState<Toast[]>([])

  // Placeholder for the Remotion overlay: a short burst per command that changed the world.
  useEffect(
    () =>
      on('commandExecuted', ({ placed, removed }) => {
        if (!placed && !removed) return
        const id = ++toastId
        const text = [placed && `+${placed}`, removed && `−${removed}`].filter(Boolean).join('  ')
        setToasts((t) => [...t.slice(-2), { id, text }])
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 1600)
      }),
    [],
  )

  return (
    <div className={`hud time-${time}`}>
      <div className="brand">
        <span className="brand-cube" aria-hidden />
        <span>
          block<b>script</b>
        </span>
      </div>

      <dl className="stats">
        <div>
          <dt>bot</dt>
          <dd>
            {bot.x} {bot.y} {bot.z} · {FACING_NAME[bot.facing]}
          </dd>
        </div>
        <div>
          <dt>bloques</dt>
          <dd>{blockCount}</dd>
        </div>
      </dl>

      {place && (
        <div className="pointer-info">
          <span>
            apuntando <b>{place.join(' ')}</b>
          </span>
          {block && (
            <span>
              bloque <b>{block.join(' ')}</b>
            </span>
          )}
          <small>click: copiar · shift+click: el bloque</small>
        </div>
      )}

      <div className="toasts" aria-hidden>
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.text}
          </div>
        ))}
      </div>
    </div>
  )
}

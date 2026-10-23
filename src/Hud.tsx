import { FACING_NAME } from './engine/ops'
import { useWorld } from './store/worldStore'
import { useHover } from './world/pointer'

/** Overlay on the 3D stage: brand, live stats and pointer coordinates. */
export function Hud() {
  const bot = useWorld((s) => s.bot)
  const blockCount = useWorld((s) => s.blockCount)
  const time = useWorld((s) => s.time)
  const place = useHover((s) => s.place)
  const block = useHover((s) => s.block)

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
    </div>
  )
}

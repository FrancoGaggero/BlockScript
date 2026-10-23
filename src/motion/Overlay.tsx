import { Player, type PlayerRef } from '@remotion/player'
import { useEffect, useRef, useState, type ComponentType } from 'react'
import { on } from '../store/eventBus'
import { AchievementCard, ACHIEVEMENT_CARD } from './compositions/AchievementCard'
import { REPLAY, replayTiming } from './compositions/replayConfig'
import { BURST, CommandBurst } from './compositions/CommandBurst'
import { Intro, INTRO } from './compositions/Intro'
import { prefersReducedMotion, useMotion } from './motionStore'

interface Timing {
  width: number
  height: number
  fps: number
  durationInFrames: number
}

/** A Player that plays once on mount and reports when it ends. Remount it (new key) to replay. */
function OneShot<P extends Record<string, unknown>>({
  component,
  inputProps,
  timing,
  onEnded,
}: {
  component: ComponentType<P>
  inputProps: P
  timing: Timing
  onEnded: () => void
}) {
  const ref = useRef<PlayerRef>(null)
  const onEndedRef = useRef(onEnded)
  useEffect(() => {
    onEndedRef.current = onEnded
  })
  useEffect(() => {
    const player = ref.current
    if (!player) return
    const handle = () => onEndedRef.current()
    player.addEventListener('ended', handle)
    return () => player.removeEventListener('ended', handle)
  }, [])

  return (
    <Player
      ref={ref}
      component={component as ComponentType<Record<string, unknown>>}
      inputProps={inputProps}
      compositionWidth={timing.width}
      compositionHeight={timing.height}
      fps={timing.fps}
      durationInFrames={timing.durationInFrames}
      autoPlay
      controls={false}
      clickToPlay={false}
      spaceKeyToPlayOrPause={false}
      style={{ width: '100%', height: '100%' }}
      acknowledgeRemotionLicense
    />
  )
}

/** Command bursts and achievement cards, layered over the 3D stage and driven by app events. */
export function MotionOverlay() {
  const burst = useMotion((s) => s.burst)
  const achievement = useMotion((s) => s.achievementQueue[0])

  useEffect(() => {
    const { showBurst, queueAchievement } = useMotion.getState()
    const offs = [
      on('commandExecuted', (e) => {
        const visible = e.placed || e.removed || ['time', 'weather', 'camera'].includes(e.command)
        if (visible && !prefersReducedMotion()) showBurst({ input: e.input, placed: e.placed, removed: e.removed })
      }),
      on('achievementUnlocked', (e) => queueAchievement(e.achievement)),
    ]
    return () => offs.forEach((off) => off())
  }, [])

  return (
    <>
      {burst && (
        <div className="motion-burst" aria-hidden>
          <OneShot
            key={burst.id}
            component={CommandBurst}
            inputProps={burst.props}
            timing={BURST}
            onEnded={() => useMotion.getState().clearBurst(burst.id)}
          />
        </div>
      )}
      {achievement && (
        <div className="motion-achievement" role="status" aria-label={`Logro desbloqueado: ${achievement.title}`}>
          <OneShot
            key={achievement.id}
            component={AchievementCard}
            inputProps={{ title: achievement.title, description: achievement.description, block: achievement.block }}
            timing={ACHIEVEMENT_CARD}
            onEnded={() => useMotion.getState().shiftAchievement()}
          />
        </div>
      )}
    </>
  )
}

/** Full-screen opening. The composition takes the window's aspect ratio so it never letterboxes. */
export function IntroOverlay() {
  const done = useMotion((s) => s.introDone)
  const [height] = useState(() =>
    Math.round(Math.min(3400, Math.max(600, (INTRO.width * window.innerHeight) / Math.max(1, window.innerWidth)))),
  )

  useEffect(() => {
    if (prefersReducedMotion()) useMotion.getState().finishIntro()
  }, [])

  useEffect(() => {
    if (done) return
    const skip = () => useMotion.getState().finishIntro()
    window.addEventListener('keydown', skip)
    return () => window.removeEventListener('keydown', skip)
  }, [done])

  if (done) return null
  const finish = () => {
    useMotion.getState().finishIntro()
    document.getElementById('term-input')?.focus()
  }
  return (
    <div className="intro" onClick={finish}>
      <OneShot
        component={Intro}
        inputProps={{ subtitle: 'un mundo que se programa', command: 'help' }}
        timing={{ ...INTRO, height }}
        onEnded={finish}
      />
      <button className="intro-skip" onClick={finish}>
        saltar intro ↵
      </button>
    </div>
  )
}

// The 3D replay pulls in @remotion/three, so it only loads when someone opens a replay.
const lazyReplay = () => import('./compositions/BuildReplay').then((m) => ({ default: m.BuildReplay }))

/** Modal with the timelapse of the session, opened by the `replay` command. */
export function ReplayModal() {
  const replay = useMotion((s) => s.replay)

  useEffect(() => {
    if (!replay) return
    const close = (e: KeyboardEvent) => e.key === 'Escape' && useMotion.getState().closeReplay()
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [replay])

  if (!replay) return null
  const close = () => {
    useMotion.getState().closeReplay()
    document.getElementById('term-input')?.focus()
  }
  return (
    <div className="replay-backdrop" onClick={close}>
      <div className="replay-dialog" role="dialog" aria-label="Replay de la construcción" onClick={(e) => e.stopPropagation()}>
        <header>
          <span>replay · {replay.log.length} cambios</span>
          <button onClick={close} aria-label="Cerrar">
            esc ✕
          </button>
        </header>
        <Player
          lazyComponent={lazyReplay}
          inputProps={replay}
          compositionWidth={REPLAY.width}
          compositionHeight={REPLAY.height}
          fps={REPLAY.fps}
          durationInFrames={replayTiming(replay.log.length).total}
          autoPlay
          loop
          controls
          style={{ width: '100%', aspectRatio: `${REPLAY.width} / ${REPLAY.height}` }}
          acknowledgeRemotionLicense
        />
      </div>
    </div>
  )
}

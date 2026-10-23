import { Composition } from 'remotion'
import { AchievementCard, ACHIEVEMENT_CARD } from './compositions/AchievementCard'
import { BuildReplay } from './compositions/BuildReplay'
import { REPLAY, replayTiming } from './compositions/replayConfig'
import { BURST, CommandBurst } from './compositions/CommandBurst'
import { Intro, INTRO } from './compositions/Intro'
import { demoReplayProps } from './demo'

/** Studio entry: the same compositions the app plays live, previewable and renderable on their own. */
export function RemotionRoot() {
  return (
    <>
      <Composition
        id="Intro"
        component={Intro}
        durationInFrames={INTRO.durationInFrames}
        fps={INTRO.fps}
        width={INTRO.width}
        height={INTRO.height}
        defaultProps={{ subtitle: 'un mundo que se programa', command: 'help' }}
      />
      <Composition
        id="CommandBurst"
        component={CommandBurst}
        durationInFrames={BURST.durationInFrames}
        fps={BURST.fps}
        width={BURST.width}
        height={BURST.height}
        defaultProps={{ input: 'fill brick -3 0 2 3 4 6 hollow', placed: 130, removed: 0 }}
      />
      <Composition
        id="Achievement"
        component={AchievementCard}
        durationInFrames={ACHIEVEMENT_CARD.durationInFrames}
        fps={ACHIEVEMENT_CARD.fps}
        width={ACHIEVEMENT_CARD.width}
        height={ACHIEVEMENT_CARD.height}
        defaultProps={{ title: 'Arquitecto', description: 'Construiste una caja hueca con fill hollow', block: 'brick' as const }}
      />
      <Composition
        id="BuildReplay"
        component={BuildReplay}
        durationInFrames={300}
        fps={REPLAY.fps}
        width={REPLAY.width}
        height={REPLAY.height}
        defaultProps={demoReplayProps()}
        calculateMetadata={({ props }) => ({ durationInFrames: replayTiming(props.log.length).total })}
      />
    </>
  )
}

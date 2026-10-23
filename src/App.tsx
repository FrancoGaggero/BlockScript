import { useEffect } from 'react'
import { initAchievements } from './achievements/achievements'
import { Terminal } from './console/Terminal'
import { Hud } from './Hud'
import { IntroOverlay, MotionOverlay, ReplayModal } from './motion/Overlay'
import { World } from './world/World'

export default function App() {
  useEffect(initAchievements, [])
  return (
    <div className="app">
      <main className="stage">
        <World />
        <Hud />
        <MotionOverlay />
      </main>
      <aside className="console">
        <Terminal />
      </aside>
      <ReplayModal />
      <IntroOverlay />
    </div>
  )
}

import { Terminal } from './console/Terminal'
import { Hud } from './Hud'
import { World } from './world/World'

export default function App() {
  return (
    <div className="app">
      <main className="stage">
        <World />
        <Hud />
      </main>
      <aside className="console">
        <Terminal />
      </aside>
    </div>
  )
}

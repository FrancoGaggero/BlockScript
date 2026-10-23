import { Canvas } from '@react-three/fiber'
import { Atmosphere } from './Atmosphere'
import { Blocks } from './Blocks'
import { Bot } from './Bot'
import { CameraRig, ORBIT_POS } from './CameraRig'
import { Cursor } from './Cursor'
import { Island } from './Island'

export function World() {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: ORBIT_POS.toArray(), fov: 42, near: 0.1, far: 300 }}>
      <Atmosphere />
      <Island />
      <Blocks />
      <Bot />
      <Cursor />
      <CameraRig />
    </Canvas>
  )
}

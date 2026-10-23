# blockscript

Un mundo de bloques 3D que se programa desde una consola. Cada comando compila a una lista de operaciones (`Op[]`) que se reproduce animada: los bloques caen uno por uno, el bot camina paso a paso y el cielo cambia con la hora y el clima.

## Correr

```bash
npm install
npm run dev
```

`npm test` corre los tests del DSL, `npm run build` arma el build de producción y `npm run studio` abre Remotion Studio con las composiciones.

## Comandos

`help` lista todos. Algunos ejemplos:

```
fill brick -3 0 2 3 4 6 hollow
move east 4; place neon; turn left
place glass ~ ~2 ~
time sunset; weather rain
camera follow
undo
js            # abre el editor de JavaScript
replay        # timelapse de tu construcción en video
logros        # logros desbloqueados
```

- `;` encadena comandos. Si uno falla, se cancelan los siguientes.
- `~` es la posición del bot (`~2` = bot + 2).
- Click en el mundo copia las coordenadas al prompt; shift+click copia las del bloque apuntado.
- Tab autocompleta, ↑/↓ recorre el historial.

## Modo JavaScript

`js` abre un editor (CodeMirror) para programar el mundo con JavaScript real. Ctrl+Enter ejecuta y Esc vuelve a la consola.

```js
for (let y = 0; y < 10; y++) world.place('stone', 6, y, 6)
bot.move('north', 3); bot.turn('right')
log(world.get(6, 0, 6), bot.pos())
```

API: `world.place/fill/remove/get`, `bot.move/turn/tp/place/pos`, `log`, `wait`, `time`, `weather`, `camera` y `BLOCKS`. El editor trae cinco ejemplos y autocompleta la API.

- El script corre en un Web Worker, contra una copia del mundo. Graba lo que hace como `Op[]` y la app lo reproduce animado, resaltando en el editor la línea que se está ejecutando.
- Cada llamada pasa por los mismos comandos del DSL, así que las reglas y los mensajes de error son los de la consola. Un error marca su línea en rojo y conserva lo que se construyó antes.
- Un loop infinito se corta a los 3 s; un script que genera más de 20.000 operaciones se frena con un aviso.

## Arquitectura

```
src/
  engine/   modelo del mundo (VoxelWorld), tipo Op, player (reproduce ops en el tiempo), executor (cola de comandos)
  console/  Terminal + DSL (tokenizer, comandos, sugerencias) + js/ (sandbox, worker, editor)
  store/    zustand: estado del mundo con undo/redo, terminal, event bus
  world/    escena R3F: isla, bloques instanciados, bot, atmósfera, cámara, cursor
  motion/   capa Remotion: composiciones (Intro, CommandBurst, AchievementCard, BuildReplay) y los Players de la app
  achievements/  logros que escuchan el event bus
```

## Motion graphics

Las composiciones de Remotion corren en vivo dentro de la app con `@remotion/player`:

- **Intro**: el logo se arma con bloques que caen y la consola tipea `help`.
- **CommandBurst**: cada comando que cambia el mundo aparece con tipografía cinética y un contador.
- **AchievementCard**: tarjeta animada al desbloquear un logro.
- **BuildReplay**: `replay` reproduce toda la sesión como timelapse 3D con `@remotion/three`, a partir del mismo log de cambios que generó la consola.

Las mismas composiciones están registradas en [src/motion/Root.tsx](src/motion/Root.tsx), así que se pueden previsualizar y renderizar a MP4 desde Studio.

Todo, sea DSL o JavaScript, produce `Op[]`. Los cambios que esas ops hacen en el mundo quedan en un log que alimenta el replay de Remotion.

Las texturas pixel-art se generan por código ([src/world/textures.ts](src/world/textures.ts)), así que el proyecto no usa arte de terceros.

## Roadmap

- [x] Fase 1–4: mundo voxel, terminal, DSL, motor de ops, undo/redo
- [x] Modo JS en un Web Worker sandbox
- [x] Capa de motion graphics con `@remotion/player` (intro, command burst, logros, replay)
- [ ] Misiones guiadas
- [ ] Compartir por URL, sonido, pulido mobile
- [ ] Video promo renderizado con Remotion y case study

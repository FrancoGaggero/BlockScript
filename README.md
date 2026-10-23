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
replay        # timelapse de tu construcción en video
logros        # logros desbloqueados
```

- `;` encadena comandos. Si uno falla, se cancelan los siguientes.
- `~` es la posición del bot (`~2` = bot + 2).
- Click en el mundo copia las coordenadas al prompt; shift+click copia las del bloque apuntado.
- Tab autocompleta, ↑/↓ recorre el historial.

## Arquitectura

```
src/
  engine/   modelo del mundo (VoxelWorld), tipo Op, player (reproduce ops en el tiempo), executor (cola de comandos)
  console/  Terminal + DSL (tokenizer, comandos, sugerencias)
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

Todo, sea DSL o el futuro modo JS, produce `Op[]`. Los cambios que esas ops hacen en el mundo quedan en un log que alimenta el replay de Remotion.

Las texturas pixel-art se generan por código ([src/world/textures.ts](src/world/textures.ts)), así que el proyecto no usa arte de terceros.

## Roadmap

- [x] Fase 1–4: mundo voxel, terminal, DSL, motor de ops, undo/redo
- [ ] Modo JS en un Web Worker sandbox
- [x] Capa de motion graphics con `@remotion/player` (intro, command burst, logros, replay)
- [ ] Misiones guiadas
- [ ] Compartir por URL, sonido, pulido mobile
- [ ] Video promo renderizado con Remotion y case study

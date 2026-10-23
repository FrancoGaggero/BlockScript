/** Starter scripts offered in the editor, ordered from simplest to most involved. */
export const EXAMPLES: { name: string; code: string }[] = [
  {
    name: 'torre',
    code: `// Una torre: un for repite la misma instrucción subiendo y
for (let y = 0; y < 10; y++) {
  world.place('stone', 6, y, 6)
}
world.place('neon', 6, 10, 6)
`,
  },
  {
    name: 'espiral',
    code: `// Una escalera caracol con seno y coseno
const materiales = ['brick', 'planks', 'gold', 'neon']

for (let i = 0; i < 24; i++) {
  const angulo = i * Math.PI / 6
  const x = Math.round(Math.cos(angulo) * 5)
  const z = Math.round(Math.sin(angulo) * 5)
  world.place(materiales[i % materiales.length], x, i, z)
}
`,
  },
  {
    name: 'pirámide',
    code: `// Funciones: cada capa es más chica que la anterior
function capa(nivel, radio) {
  world.fill('sand', -radio, nivel, -radio, radio, nivel, radio)
}

bot.tp(12, 0, 12)
for (let n = 0; n <= 6; n++) {
  capa(n, 6 - n)
}
world.place('gold', 0, 7, 0)
`,
  },
  {
    name: 'tablero',
    code: `// Un tablero de ajedrez: el resto (%) alterna los colores
bot.tp(12, 0, 12)
for (let x = -6; x <= 6; x++) {
  for (let z = -6; z <= 6; z++) {
    const par = Math.abs(x + z) % 2 === 0
    world.place(par ? 'neon' : 'cobble', x, 0, z)
  }
}
`,
  },
  {
    name: 'paseo',
    code: `// El bot camina y deja una pared a su paso
bot.tp(-8, 0, 8)
bot.turn('east')

for (let i = 0; i < 16; i++) {
  bot.move('forward')
  const { x, y, z } = bot.pos()
  world.place(i % 2 ? 'gold' : 'glass', x, y, z - 1)
  if (i % 4 === 3) world.place('neon', x, y + 1, z - 1)
}
log('el bot terminó en', bot.pos())
`,
  },
]

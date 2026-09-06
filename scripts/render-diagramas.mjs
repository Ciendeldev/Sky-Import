import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/** Los diagramas y el documento viven en `docs/srs/` del propio repositorio. */
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'srs')
for (const nombre of ['bloques', 'flujo']) {
  const svg = readFileSync(dir + '\\' + nombre + '.svg')
  const meta = await sharp(svg).metadata()
  await sharp(svg, { density: 144 })
    .resize({ width: Math.round(meta.width * 2) })
    .flatten({ background: '#ffffff' })
    .png({ compressionLevel: 9 })
    .toFile(dir + '\\' + nombre + '.png')
  const out = await sharp(dir + '\\' + nombre + '.png').metadata()
  console.log(nombre + '.png -> ' + out.width + 'x' + out.height)
}

import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '..', 'public')

const sizes = [192, 512]
const svgPath = resolve(publicDir, 'icon-192.svg')
const svgBuffer = readFileSync(svgPath)

for (const size of sizes) {
  const pngPath = resolve(publicDir, `icon-${size}.png`)
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(pngPath)
  console.log(`Generated ${pngPath}`)
}

console.log('Done! PNG icons generated.')

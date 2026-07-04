/**
 * Render the master SVG icon to the PNG sizes the PWA manifest needs, using
 * the pre-installed Chromium (no native image dependency required).
 *
 *   node scripts/generate-icons.mjs
 */
import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '../public')
const svg = readFileSync(resolve(publicDir, 'favicon.svg'), 'utf8')

const TARGETS = [
  { file: 'pwa-192x192.png', size: 192 },
  { file: 'pwa-512x512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
]

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium',
})
try {
  for (const { file, size } of TARGETS) {
    const page = await browser.newPage({ viewport: { width: size, height: size } })
    await page.setContent(
      `<!doctype html><html><body style="margin:0">
        <div style="width:${size}px;height:${size}px">${svg.replace(
          /width="512" height="512"/,
          `width="${size}" height="${size}"`,
        )}</div>
      </body></html>`,
    )
    const el = await page.$('svg')
    const buf = await el.screenshot({ omitBackground: true })
    writeFileSync(resolve(publicDir, file), buf)
    console.log(`wrote ${file} (${size}px)`)
    await page.close()
  }
} finally {
  await browser.close()
}

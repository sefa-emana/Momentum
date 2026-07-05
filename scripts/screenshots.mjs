/**
 * Review / marketing screenshot capture.
 *
 * Serves an EXISTING production build with `vite preview` and drives it with
 * Playwright (the pre-installed Chromium in this environment) at an iPhone-ish
 * viewport, capturing the key surfaces into ./screenshots (gitignored).
 *
 * Crucially, a rich, realistic demo state is seeded into localStorage *before*
 * the app boots: ~35 workouts across the past 10 weeks with varied types,
 * intensities and durations, a couple of PRs, a live streak, unlocked
 * achievements and completed weekly quests. The state is produced by the app's
 * OWN domain engine (`rebuildFromWorkouts`), bundled on the fly with esbuild, so
 * every derived value (momentum, XP, level, mastery, quests, achievements) is
 * perfectly self-consistent — exactly what a real long-term user would have.
 *
 * Usage: `npm run screenshots`  (run `npm run build` first).
 */
import { spawn } from 'node:child_process'
import { mkdir, rm, writeFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { build } from 'esbuild'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT_DIR = resolve(ROOT, 'screenshots')
const CHROMIUM = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium'
const PORT = 4188
const BASE = '/Momentum/'
const URL = `http://localhost:${PORT}${BASE}`
const STORAGE_KEY = 'momentum-state-v1'
const STATE_VERSION = 4

// ---------------------------------------------------------------------------
// 1. Bundle the real domain + store engine so we can build a faithful state.
// ---------------------------------------------------------------------------
async function loadEngine() {
  const outfile = resolve(OUT_DIR, '.engine.bundle.mjs')
  await build({
    stdin: {
      contents: `
        export { rebuildFromWorkouts } from './src/state/store.ts'
        export { offeredQuests, weekKey, WORKOUT_TYPES } from './src/domain/index.ts'
      `,
      resolveDir: ROOT,
      loader: 'ts',
    },
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    logLevel: 'error',
  })
  const mod = await import(pathToFileURL(outfile).href)
  await rm(outfile, { force: true })
  return mod
}

// ---------------------------------------------------------------------------
// 2. Generate a rich, realistic demo history (deterministic — no randomness).
// ---------------------------------------------------------------------------
const DAY = 86_400_000
const TYPES = ['strength', 'cardio', 'mobility', 'sport', 'other']
const INTENSITIES = ['light', 'moderate', 'vigorous']

/** Small deterministic PRNG so the demo state is stable across runs. */
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function iso(ms) {
  return new Date(ms).toISOString()
}

/** Build workout inputs (id/date/type/duration/intensity/feel/prBeaten). */
function generateWorkouts(now, weekStartMs) {
  const rnd = mulberry32(0xa11ce)
  const out = []
  let id = 0
  const push = (ms, type, durationMin, intensity, extra = {}) =>
    out.push({
      id: `demo-${String(id++).padStart(3, '0')}`,
      date: iso(ms),
      type,
      durationMin,
      intensity,
      ...extra,
    })

  // Ten prior weeks (weeks 10..1 before the current one): 3–4 sessions/week on
  // spread-out days, varied types/intensities/durations, an occasional PR.
  for (let w = 10; w >= 1; w--) {
    const base = weekStartMs - w * 7 * DAY
    const sessions = 3 + (rnd() > 0.5 ? 1 : 0)
    const dayPool = [0, 1, 2, 3, 4, 5, 6]
    // pick distinct days
    for (let s = 0; s < sessions; s++) {
      const di = Math.floor(rnd() * dayPool.length)
      const day = dayPool.splice(di, 1)[0]
      const type = TYPES[Math.floor(rnd() * TYPES.length)]
      const intensity = INTENSITIES[Math.floor(rnd() * INTENSITIES.length)]
      const durationMin = 25 + Math.floor(rnd() * 50)
      const extra = {}
      if (rnd() > 0.9) extra.prBeaten = true
      if (rnd() > 0.5) extra.feel = [3, 5, 7, 9][Math.floor(rnd() * 4)]
      push(base + day * DAY + 18 * 3600_000, type, durationMin, intensity, extra)
    }
  }

  // Current ISO week — deliberately rich so the week strip, quests and streak
  // all read strong. Distinct days from Monday up to today, varied disciplines.
  const todayOffset = Math.floor((now - weekStartMs) / DAY) // 0..6
  const thisWeekPlan = [
    { day: 0, type: 'strength', dur: 55, intensity: 'vigorous', prBeaten: true, feel: 7 },
    { day: 1, type: 'mobility', dur: 30, intensity: 'light', feel: 3 },
    { day: 2, type: 'cardio', dur: 45, intensity: 'moderate', feel: 5 },
    { day: 3, type: 'strength', dur: 50, intensity: 'vigorous', feel: 7 },
    { day: 4, type: 'sport', dur: 60, intensity: 'moderate', feel: 5 },
    { day: 5, type: 'mobility', dur: 25, intensity: 'light', feel: 3 },
    { day: 6, type: 'cardio', dur: 40, intensity: 'moderate', prBeaten: true, feel: 7 },
  ]
  for (const p of thisWeekPlan) {
    if (p.day > todayOffset) continue // never log the future
    const extra = { feel: p.feel }
    if (p.prBeaten) extra.prBeaten = true
    push(weekStartMs + p.day * DAY + 18 * 3600_000, p.type, p.dur, p.intensity, extra)
  }
  // Guarantee the streak is alive: a session dated "today".
  if (!out.some((wk) => wk.date.slice(0, 10) === iso(now).slice(0, 10))) {
    push(now - 3 * 3600_000, 'cardio', 40, 'moderate', { feel: 5 })
  }

  // Progression Engine v2: two prior strength sessions WITH per-set entries so
  // the log sheet shows ghost values + an "addWeight" progression hint, and the
  // history/edit sheet render real set summaries. Both sessions hit the top of
  // the rep band at the same load → the 2×2 rule fires (+2,5 kg).
  const strengthEntries = () => [
    {
      exerciseId: 'bench-press',
      sets: [
        { weightKg: 60, reps: 8, kind: 'normal' },
        { weightKg: 60, reps: 8, kind: 'normal' },
        { weightKg: 60, reps: 8, kind: 'normal' },
      ],
    },
    {
      exerciseId: 'barbell-row',
      sets: [
        { weightKg: 50, reps: 10, kind: 'normal' },
        { weightKg: 50, reps: 10, kind: 'normal' },
        { weightKg: 50, reps: 10, kind: 'normal' },
      ],
    },
  ]
  push(now - 11 * DAY + 18 * 3600_000, 'strength', 55, 'vigorous', {
    feel: 7,
    entries: strengthEntries(),
  })
  push(now - 4 * DAY + 18 * 3600_000, 'strength', 55, 'vigorous', {
    feel: 7,
    entries: strengthEntries(),
  })

  return out.sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
}

/** Start-of-ISO-week (Monday 00:00 local) for a given moment. */
function isoWeekStart(now) {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  const dow = (d.getDay() + 6) % 7 // Mon=0 … Sun=6
  d.setDate(d.getDate() - dow)
  return d.getTime()
}

function buildState(engine) {
  const now = Date.now()
  const weekStartMs = isoWeekStart(now)
  const workouts = generateWorkouts(now, weekStartMs)

  // Accept both of this week's offered quests so they show as completed (the
  // engine derives `questsDone` from the rich current-week history).
  const wk = engine.weekKey(iso(now))
  const offers = engine.offeredQuests(wk)
  const acceptedAt = iso(weekStartMs)
  const acceptedQuests = offers.map((q) => ({ id: q.id, week: wk, acceptedAt }))

  const prev = {
    createdAt: iso(now - 74 * DAY),
    onboarded: true,
    version: STATE_VERSION,
    pauses: [],
    acceptedQuests,
    settings: {
      name: 'Sefa',
      weeklyGoal: { workoutsPerWeek: 4 },
      reducedMotion: false,
    },
  }

  const full = engine.rebuildFromWorkouts(prev, workouts)

  // Partialize exactly like the store's `partialize` so hydration is faithful.
  const persistedState = {
    version: full.version,
    createdAt: full.createdAt,
    workouts: full.workouts,
    bonusXp: full.bonusXp,
    goalMetWeeks: full.goalMetWeeks,
    progressWeeks: full.progressWeeks,
    pauses: full.pauses,
    acceptedQuests: full.acceptedQuests,
    questsDone: full.questsDone,
    unlocked: full.unlocked,
    settings: full.settings,
    onboarded: full.onboarded,
  }
  return { state: persistedState, version: STATE_VERSION }
}

// ---------------------------------------------------------------------------
// 3. Preview server helpers.
// ---------------------------------------------------------------------------
function startPreview() {
  const child = spawn(
    'npm',
    ['run', 'preview', '--', '--port', String(PORT), '--strictPort'],
    { cwd: ROOT, stdio: 'ignore' },
  )
  return child
}

async function waitForServer(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(URL)
      if (res.ok) return
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  throw new Error(`preview server did not start on ${URL}`)
}

// ---------------------------------------------------------------------------
// 4. Capture.
// ---------------------------------------------------------------------------
async function newSeededContext(browser, persisted, theme) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: theme === 'dark' ? 'dark' : 'light',
  })
  await context.addInitScript(
    ({ key, value, theme }) => {
      try {
        localStorage.setItem(key, value)
        localStorage.setItem('momentum-theme', theme)
      } catch {
        /* ignore */
      }
    },
    { key: STORAGE_KEY, value: JSON.stringify(persisted), theme },
  )
  return context
}

async function gotoApp(page) {
  await page.goto(URL, { waitUntil: 'networkidle' })
  // Wait until the seeded (non-onboarding) dashboard is present.
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).waitFor({ timeout: 15_000 })
  await page.getByText('Momentum', { exact: true }).first().waitFor({ timeout: 15_000 })
  await page.waitForTimeout(700) // settle animations / ring fill
}

async function shoot(page, name) {
  const path = resolve(OUT_DIR, `${name}.png`)
  await page.screenshot({ path })
  const { size } = await stat(path)
  console.log(`  ✓ ${name}.png (${(size / 1024).toFixed(0)} KB)`)
  return size
}

async function openTab(page, label) {
  await page.getByRole('button', { name: label, exact: true }).first().click()
  await page.waitForTimeout(600)
}

async function main() {
  if (!existsSync(resolve(ROOT, 'dist', 'index.html'))) {
    throw new Error('No dist build found — run `npm run build` first.')
  }
  await rm(OUT_DIR, { recursive: true, force: true })
  await mkdir(OUT_DIR, { recursive: true })

  console.log('• Bundling domain engine…')
  const engine = await loadEngine()
  console.log('• Seeding demo state…')
  const persisted = buildState(engine)
  console.log(
    `  ${persisted.state.workouts.length} workouts · ` +
      `${persisted.state.unlocked.length} achievements · ` +
      `${persisted.state.questsDone.length} quests done · ` +
      `${persisted.state.bonusXp} bonus XP`,
  )

  console.log('• Starting preview server…')
  const server = startPreview()
  const browser = await chromium.launch({ executablePath: CHROMIUM })
  try {
    await waitForServer()

    // ---- Light theme: the primary design. ----
    const light = await newSeededContext(browser, persisted, 'light')
    const page = await light.newPage()
    await gotoApp(page)
    await shoot(page, '01-dashboard')

    await openTab(page, 'Verlauf')
    await page.getByText(/Konsistenz|Verlauf/).first().waitFor({ timeout: 10_000 }).catch(() => {})
    await shoot(page, '02-history-heatmap')

    await openTab(page, 'Erfolge')
    await shoot(page, '03-erfolge')

    await openTab(page, 'Profil')
    await shoot(page, '04-profile')

    // Back to home, open the log sheet.
    await openTab(page, 'Home')
    await page.getByRole('button', { name: 'Training loggen' }).first().click()
    await page.getByRole('dialog', { name: 'Training loggen' }).waitFor({ timeout: 10_000 })
    await page.waitForTimeout(500)
    await shoot(page, '05-log-sheet')

    // 07 — Satz-Modus: add an exercise (ghost values + progression hint).
    await page.getByTestId('add-exercise').click()
    await page.getByRole('dialog', { name: 'Übung wählen' }).waitFor({ timeout: 10_000 })
    await page.getByRole('button', { name: /^Bankdrücken/ }).first().click()
    await page
      .getByTestId('progress-hint')
      .first()
      .waitFor({ timeout: 10_000 })
      .catch(() => {})
    await page.waitForTimeout(500)
    await shoot(page, '07-log-satzmodus')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // 08 — Edit a logged strength session WITH set entries (sets shown, editable).
    await openTab(page, 'Verlauf')
    await page
      .getByRole('button', { name: 'Kraft bearbeiten' })
      .filter({ hasText: 'Bankdrücken' })
      .first()
      .click()
    await page.getByRole('dialog', { name: 'Einheit bearbeiten' }).waitFor({ timeout: 10_000 })
    await page.waitForTimeout(500)
    await shoot(page, '08-edit-workout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // 09 — Fortschritt tab: exercise list with e1RM sparklines + pattern balance.
    await openTab(page, 'Fortschritt')
    await page.waitForTimeout(700)
    await shoot(page, '09-fortschritt')

    // 10 — Exercise detail: e1RM trend, volume, Bestwerte, progression hint.
    await page.getByRole('button', { name: /^Bankdrücken/ }).first().click()
    await page.waitForTimeout(700)
    await shoot(page, '10-uebung-detail')
    await light.close()

    // ---- Dark theme: the de-blued graphite secondary option. ----
    const dark = await newSeededContext(browser, persisted, 'dark')
    const darkPage = await dark.newPage()
    await gotoApp(darkPage)
    await shoot(darkPage, '06-dashboard-dark')
    await dark.close()
  } finally {
    await browser.close()
    server.kill('SIGTERM')
  }
  console.log(`\nDone → ${OUT_DIR}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

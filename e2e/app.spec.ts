import { test, expect } from '@playwright/test'
import { APP_URL, logWorkout, onboard } from './helpers'

test.describe('Onboarding', () => {
  test('walks through the intro and lands on the dashboard', async ({ page }) => {
    await onboard(page, 'Alex')
    await expect(page.getByRole('heading', { name: /Alex/ })).toBeVisible()
    // Fresh profile → warm first-run invitation (no empty ring), Level 1 pill.
    await expect(page.getByText('Bereit für den ersten Schritt?')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Erste Einheit loggen' })).toBeVisible()
    await expect(page.getByLabel('Level 1')).toBeVisible()
  })

  test('does not show onboarding again after completing it', async ({ page }) => {
    await onboard(page, 'Alex')
    await page.reload()
    // Straight to dashboard, no "Weiter" onboarding button.
    await expect(page.getByRole('heading', { name: /Alex/ })).toBeVisible()
  })
})

test.describe('Logging workouts', () => {
  test('awards XP and unlocks the first achievement', async ({ page }) => {
    await onboard(page)
    await page.getByRole('button', { name: 'Training loggen' }).first().click()

    // XP preview is shown before submitting.
    await expect(page.getByText(/\+\d+ XP/)).toBeVisible()

    await page.getByTestId('submit-workout').click()

    const reward = page.getByRole('dialog', { name: 'Belohnung' })
    await expect(reward).toBeVisible()
    await expect(reward.locator('.hero-number')).toContainText('XP')
    await expect(reward.getByText('Erster Schritt')).toBeVisible()

    await reward.getByRole('button', { name: 'Weiter' }).click()

    // Dashboard now reflects one workout.
    await expect(page.getByText('Einheiten gesamt')).toBeVisible()
    await expect(page.getByTestId('stat-total-workouts')).toContainText('1')
  })

  test('accumulates total XP after a session', async ({ page }) => {
    await onboard(page)
    await logWorkout(page)
    const xpText = await page.getByText(/XP gesamt/).textContent()
    const total = Number(xpText?.match(/([\d.]+)\s*XP gesamt/)?.[1]?.replace('.', ''))
    expect(total).toBeGreaterThan(0)
  })

  test('shows the logged workout in history', async ({ page }) => {
    await onboard(page)
    await logWorkout(page, { type: 'Cardio' })

    await page.getByRole('button', { name: 'Verlauf' }).click()
    await expect(page.getByRole('heading', { name: 'Verlauf' })).toBeVisible()
    await expect(page.getByText('Cardio')).toBeVisible()
    await expect(page.getByText('Heute')).toBeVisible()
  })

  test('deleting a workout removes it and resets derived stats', async ({ page }) => {
    await onboard(page)
    await logWorkout(page, { type: 'Cardio' })

    await page.getByRole('button', { name: 'Verlauf' }).click()
    await expect(page.getByText('Cardio')).toBeVisible()

    page.on('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Einheit löschen' }).click()
    await expect(page.getByText('Noch keine Einheiten. Tippe auf +, um deine erste zu loggen.')).toBeVisible()

    // Back on the dashboard the state is reset → the first-run invitation returns.
    await page.getByRole('button', { name: 'Home' }).click()
    await expect(page.getByText('Bereit für den ersten Schritt?')).toBeVisible()
  })
})

test.describe('Momentum & streak', () => {
  test('momentum rises above zero after a workout', async ({ page }) => {
    await onboard(page)
    await logWorkout(page)
    // Ring shows the current momentum value (>= floor of 15).
    const ring = page.getByRole('img', { name: /Momentum \d+ von 100/ })
    await expect(ring).toBeVisible()
    const label = await ring.getAttribute('aria-label')
    const value = Number(label?.match(/Momentum (\d+)/)?.[1])
    expect(value).toBeGreaterThanOrEqual(15)
  })

  test('streak shows 1 after the first workout', async ({ page }) => {
    await onboard(page)
    await logWorkout(page)
    await expect(page.getByTestId('stat-streak')).toContainText('1')
  })
})

test.describe('Weekly goal', () => {
  test('reflects progress toward the goal', async ({ page }) => {
    await onboard(page, 'Sefa', 2)
    await logWorkout(page)
    await expect(page.getByText('1 / 2')).toBeVisible()
  })
})

test.describe('Persistence', () => {
  test('keeps data across a reload', async ({ page }) => {
    await onboard(page)
    await logWorkout(page)
    await logWorkout(page)

    await page.reload()

    await expect(page.getByTestId('stat-total-workouts')).toContainText('2')
  })

  test('survives a localStorage wipe — IndexedDB is authoritative', async ({ page }) => {
    await onboard(page)
    await logWorkout(page)
    await logWorkout(page)

    // Wipe only the secondary localStorage snapshot; the durable IndexedDB copy
    // must still rehydrate the full state on reload (the whole point of Wave 4).
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    await expect(page.getByTestId('stat-total-workouts')).toContainText('2')
    // And onboarding must NOT reappear (state truly restored from IndexedDB).
    await expect(page.getByTestId('stat-total-workouts')).toBeVisible()
  })
})

test.describe('Achievements screen', () => {
  test('lists achievements and unlock progress', async ({ page }) => {
    await onboard(page)
    await logWorkout(page)

    await page.getByRole('button', { name: 'Erfolge' }).click()
    await expect(page.getByRole('heading', { name: 'Erfolge' })).toBeVisible()
    await expect(page.getByText('Erster Schritt')).toBeVisible()
    await expect(page.getByText('✓ Erreicht').first()).toBeVisible()
  })
})

test.describe('Profile', () => {
  test('can change the weekly goal', async ({ page }) => {
    await onboard(page)
    // Log once so the dashboard shows the "Diese Woche" card (hidden at zero).
    await logWorkout(page)
    await page.getByRole('button', { name: 'Profil' }).click()
    await expect(page.getByRole('heading', { name: 'Profil' })).toBeVisible()
    await page.getByLabel(/Wochenziel/).fill('6')
    await page.getByRole('button', { name: 'Home' }).click()
    await expect(page.getByText('1 / 6')).toBeVisible()
  })

  test('reset clears all data and returns to onboarding', async ({ page }) => {
    await onboard(page)
    await logWorkout(page)
    await page.getByRole('button', { name: 'Profil' }).click()

    page.on('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Alle Daten zurücksetzen' }).click()

    await expect(page.getByRole('heading', { name: 'Momentum' })).toBeVisible()
  })
})

test.describe('Wave 2 — mechanics in the UI', () => {
  test('renders the consistency heatmap in history', async ({ page }) => {
    await onboard(page)
    await logWorkout(page)

    await page.getByRole('button', { name: 'Verlauf' }).click()
    await expect(page.getByRole('heading', { name: 'Verlauf' })).toBeVisible()
    await expect(page.getByTestId('heatmap')).toBeVisible()
  })

  test('"Mehr (optional)" reveals a selectable feel chip', async ({ page }) => {
    await onboard(page)
    await page.getByRole('button', { name: 'Training loggen' }).first().click()
    await expect(page.getByRole('dialog', { name: 'Training loggen' })).toBeVisible()

    await page.getByRole('button', { name: 'Mehr (optional)' }).click()
    const solide = page.getByRole('button', { name: 'Solide' })
    await expect(solide).toBeVisible()
    await solide.click()
    await expect(solide).toHaveAttribute('aria-pressed', 'true')
  })

  test('starting and ending a "Life happened" pause round-trips', async ({ page }) => {
    await onboard(page)
    await page.getByRole('button', { name: 'Profil' }).click()

    await page.getByRole('button', { name: 'Pause starten' }).click()
    await expect(page.getByRole('button', { name: 'Pause beenden' })).toBeVisible()

    await page.getByRole('button', { name: 'Pause beenden' }).click()
    await expect(page.getByRole('button', { name: 'Pause starten' })).toBeVisible()
  })
})

test.describe('Wave 3 — endgame', () => {
  test('mastery section renders after logging a workout', async ({ page }) => {
    await onboard(page)
    await logWorkout(page) // default type: strength → "Kraft"

    await page.getByRole('button', { name: 'Erfolge' }).click()
    await expect(page.getByRole('heading', { name: 'Erfolge' })).toBeVisible()
    await expect(page.getByText('Meisterschaft', { exact: true })).toBeVisible()
    await expect(page.getByText('Kraft', { exact: true })).toBeVisible()
    await expect(page.getByText(/Level 1/).first()).toBeVisible()
  })

  test('a weekly quest can be accepted and shows live progress', async ({ page }) => {
    await onboard(page)

    await page.getByRole('button', { name: 'Erfolge' }).click()
    await expect(page.getByText('Quests der Woche')).toBeVisible()

    const accept = page.getByRole('button', { name: 'Annehmen' }).first()
    await expect(accept).toBeVisible()
    await accept.click()

    await expect(page.getByText('Angenommen').first()).toBeVisible()
  })
})

test.describe('Logging-UX v2 — Satz-Modus & editing', () => {
  test('logs a strength session via Satz-Modus and shows it in history', async ({ page }) => {
    await onboard(page)
    await page.getByRole('button', { name: 'Training loggen' }).first().click()
    await expect(page.getByRole('dialog', { name: 'Training loggen' })).toBeVisible()

    // Strength defaults to Satz-Modus → add an exercise via the picker.
    await page.getByTestId('add-exercise').click()
    await expect(page.getByRole('dialog', { name: 'Übung wählen' })).toBeVisible()
    await page.getByLabel('Übung suchen').fill('Bankdr')
    await page.getByRole('button', { name: /^Bankdrücken/ }).first().click()

    // Confirm two ghost/blank sets (one tap each), then save.
    await page.getByRole('button', { name: 'Satz 1 bestätigen' }).click()
    await page.getByRole('button', { name: 'Satz', exact: true }).click()
    await page.getByRole('button', { name: 'Satz 2 bestätigen' }).click()

    await page.getByTestId('submit-workout').click()
    const reward = page.getByRole('dialog', { name: 'Belohnung' })
    await expect(reward).toBeVisible()
    await reward.getByRole('button', { name: 'Weiter' }).click()

    await page.getByRole('button', { name: 'Verlauf' }).click()
    await expect(page.getByText(/Bankdrücken/)).toBeVisible()
  })

  test('the log sheet has a dedicated drag region and closes via Escape + backdrop', async ({ page }) => {
    await onboard(page)
    await page.getByRole('button', { name: 'Training loggen' }).first().click()
    const dialog = page.getByRole('dialog', { name: 'Training loggen' })
    await expect(dialog).toBeVisible()

    // Drag-to-dismiss uses a dedicated drag region (handle + header).
    await expect(page.locator('.sheet-drag').first()).toBeVisible()

    // Escape closes.
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    // Backdrop click closes too.
    await page.getByRole('button', { name: 'Training loggen' }).first().click()
    await expect(dialog).toBeVisible()
    await page.locator('.overlay-backdrop').first().click({ position: { x: 8, y: 8 } })
    await expect(dialog).toBeHidden()
  })

  test('editing a workout recomputes its XP in history', async ({ page }) => {
    await onboard(page)
    await logWorkout(page) // strength, 30 min

    await page.getByRole('button', { name: 'Verlauf' }).click()
    const pill = page.locator('.list-item .pill').first()
    const before = Number((await pill.textContent())?.replace(/\D/g, ''))

    await page.getByRole('button', { name: 'Kraft bearbeiten' }).click()
    await expect(page.getByRole('dialog', { name: 'Einheit bearbeiten' })).toBeVisible()
    await page.getByRole('button', { name: '90′' }).click()
    await page.getByTestId('save-edit').click()
    await expect(page.getByRole('dialog', { name: 'Einheit bearbeiten' })).toBeHidden()

    await expect(page.locator('.list-item').first().getByText('90′')).toBeVisible()
    const after = Number((await pill.textContent())?.replace(/\D/g, ''))
    expect(after).toBeGreaterThan(before)
  })

  test('duplicating a workout prefills the log sheet and creates a second session', async ({ page }) => {
    await onboard(page)
    await logWorkout(page)

    await page.getByRole('button', { name: 'Verlauf' }).click()
    await page.getByRole('button', { name: 'Kraft bearbeiten' }).click()
    await page.getByRole('button', { name: 'Duplizieren' }).click()

    // Prefilled log sheet opens; save it.
    await expect(page.getByRole('dialog', { name: 'Training loggen' })).toBeVisible()
    await page.getByTestId('submit-workout').click()
    const reward = page.getByRole('dialog', { name: 'Belohnung' })
    await expect(reward).toBeVisible()
    await reward.getByRole('button', { name: 'Weiter' }).click()

    await page.getByRole('button', { name: 'Home' }).click()
    await expect(page.getByTestId('stat-total-workouts')).toContainText('2')
  })

  test('deleting from history offers an undo that restores the session', async ({ page }) => {
    await onboard(page)
    await logWorkout(page)

    await page.getByRole('button', { name: 'Verlauf' }).click()
    await page.getByRole('button', { name: 'Einheit löschen' }).click()
    await expect(page.getByText('Einheit gelöscht')).toBeVisible()
    await page.getByRole('button', { name: 'Rückgängig' }).click()

    await page.getByRole('button', { name: 'Home' }).click()
    await expect(page.getByTestId('stat-total-workouts')).toContainText('1')
  })
})

test.describe('Fortschritt tab', () => {
  /** Log one Bankdrücken strength session via Satz-Modus (two confirmed sets). */
  async function logBench(page: import('@playwright/test').Page) {
    await page.getByRole('button', { name: 'Training loggen' }).first().click()
    await expect(page.getByRole('dialog', { name: 'Training loggen' })).toBeVisible()
    await page.getByTestId('add-exercise').click()
    await expect(page.getByRole('dialog', { name: 'Übung wählen' })).toBeVisible()
    await page.getByLabel('Übung suchen').fill('Bankdr')
    await page.getByRole('button', { name: /^Bankdrücken/ }).first().click()
    await page.getByRole('button', { name: 'Satz 1 bestätigen' }).click()
    await page.getByRole('button', { name: 'Satz', exact: true }).click()
    await page.getByRole('button', { name: 'Satz 2 bestätigen' }).click()
    await page.getByTestId('submit-workout').click()
    const reward = page.getByRole('dialog', { name: 'Belohnung' })
    await expect(reward).toBeVisible()
    await reward.getByRole('button', { name: 'Weiter' }).click()
    await expect(reward).toBeHidden()
  }

  test('lists a logged strength exercise and opens its detail with a chart', async ({ page }) => {
    await onboard(page)
    await logBench(page)
    await logBench(page)

    await page.getByRole('button', { name: 'Fortschritt', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Fortschritt' })).toBeVisible()

    // Pattern balance renders (Drücken from Bankdrücken).
    await expect(page.getByText('Muster-Balance · diese Woche')).toBeVisible()
    await expect(page.getByText('Drücken').first()).toBeVisible()

    // The exercise appears in the list; tapping it opens the detail sheet.
    const row = page.getByRole('button', { name: 'Bankdrücken — Details' })
    await expect(row).toBeVisible()
    await row.click()

    const detail = page.getByRole('dialog', { name: /Bankdrücken — Fortschritt/ })
    await expect(detail).toBeVisible()
    await expect(detail.getByText('Bestwerte')).toBeVisible()
    await expect(detail.getByText('Letzte Einheiten')).toBeVisible()
  })

  test('the Dashboard Fortschritt card links to the tab', async ({ page }) => {
    await onboard(page)
    await logBench(page)

    await page.getByRole('button', { name: 'Fortschritt öffnen' }).click()
    await expect(page.getByRole('heading', { name: 'Fortschritt' })).toBeVisible()
  })
})

test('has PWA manifest and service worker registration', async ({ page }) => {
  await page.goto(APP_URL)
  const manifestHref = await page.getAttribute('link[rel="manifest"]', 'href')
  expect(manifestHref).toBeTruthy()
  const res = await page.request.get(`${APP_URL}manifest.webmanifest`)
  expect(res.ok()).toBeTruthy()
  const manifest = await res.json()
  expect(manifest.name).toContain('Momentum')
  expect(manifest.icons.length).toBeGreaterThan(0)
  // Wave 4: "Training loggen" app shortcut deep-links into the log sheet.
  expect(manifest.shortcuts?.[0]?.url).toContain('action=log')
})

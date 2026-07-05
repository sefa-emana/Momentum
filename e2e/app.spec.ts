import { test, expect } from '@playwright/test'
import { APP_URL, logWorkout, onboard } from './helpers'

test.describe('Onboarding', () => {
  test('walks through the intro and lands on the dashboard', async ({ page }) => {
    await onboard(page, 'Alex')
    await expect(page.getByRole('heading', { name: /Alex/ })).toBeVisible()
    await expect(page.getByRole('img', { name: /Momentum \d+ von 100/ })).toBeVisible()
    await expect(page.getByText('Level 1').first()).toBeVisible()
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
    await expect(reward.getByText(/\+\d+ XP/)).toBeVisible()
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
    await expect(page.getByText('Noch keine Einheiten. Tippe auf +, um loszulegen.')).toBeVisible()

    // Back on the dashboard the count is reset to zero.
    await page.getByRole('button', { name: 'Home' }).click()
    await expect(page.getByTestId('stat-total-workouts')).toContainText('0')
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
    await page.getByRole('button', { name: 'Profil' }).click()
    await expect(page.getByRole('heading', { name: 'Profil' })).toBeVisible()
    await page.getByLabel(/Wochenziel/).fill('6')
    await page.getByRole('button', { name: 'Home' }).click()
    await expect(page.getByText('0 / 6')).toBeVisible()
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

test('has PWA manifest and service worker registration', async ({ page }) => {
  await page.goto(APP_URL)
  const manifestHref = await page.getAttribute('link[rel="manifest"]', 'href')
  expect(manifestHref).toBeTruthy()
  const res = await page.request.get(`${APP_URL}manifest.webmanifest`)
  expect(res.ok()).toBeTruthy()
  const manifest = await res.json()
  expect(manifest.name).toContain('Momentum')
  expect(manifest.icons.length).toBeGreaterThan(0)
})

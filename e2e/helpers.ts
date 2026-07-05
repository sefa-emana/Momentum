import { type Page, expect } from '@playwright/test'

export const APP_URL = '/Momentum/'

/** Load the app fresh (cleared storage) and run through onboarding. */
export async function onboard(page: Page, name = 'Sefa', goal?: number) {
  await page.goto(APP_URL)
  await page.evaluate(() => localStorage.clear())
  await page.goto(APP_URL)

  // Step 1 — Willkommen.
  await expect(page.getByRole('heading', { name: 'Momentum' })).toBeVisible()
  await page.getByRole('button', { name: 'Weiter' }).click()

  // Step 2 — name + weekly goal.
  await page.getByLabel('Dein Name').fill(name)
  if (goal !== undefined) {
    await page.getByLabel('Wochenziel').fill(String(goal))
  }
  await page.getByRole('button', { name: 'Weiter' }).click()

  // Step 3 — training focus (defaults to "Gemischt"); finish.
  await page.getByRole('button', { name: /Los geht/ }).click()

  await expect(page.getByRole('heading', { name: new RegExp(name) })).toBeVisible()
}

/** Open the log sheet and submit a workout with the given options. */
export async function logWorkout(
  page: Page,
  opts: { type?: string; intensity?: string; duration?: number } = {},
) {
  // Prefer the FAB; fall back to the dashboard CTA.
  const fab = page.getByRole('button', { name: 'Training loggen' })
  await fab.first().click()

  await expect(page.getByRole('dialog', { name: 'Training loggen' })).toBeVisible()

  if (opts.type) await page.getByRole('button', { name: opts.type }).click()
  if (opts.intensity) await page.getByRole('button', { name: opts.intensity }).click()

  await page.getByTestId('submit-workout').click()

  // Reward overlay appears; dismiss it.
  const reward = page.getByRole('dialog', { name: 'Belohnung' })
  await expect(reward).toBeVisible()
  await reward.getByRole('button', { name: 'Weiter' }).click()
  await expect(reward).toBeHidden()
}

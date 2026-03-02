import { test, expect } from '@playwright/test'
import { captureScreenshot } from './helpers'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function clearData(page: import('@playwright/test').Page) {
  await page.evaluate(() => localStorage.clear())
  await page.reload()
}

async function createGoal(
  page: import('@playwright/test').Page,
  opts: {
    title: string
    category?: 'fitness' | 'habit' | 'learning'
    description?: string
    targetDate?: string
  }
) {
  await page.click('[data-testid="new-goal-fab"]')
  await page.fill('[data-testid="goal-title-input"]', opts.title)
  if (opts.category) await page.click(`[data-testid="category-${opts.category}"]`)
  if (opts.description) await page.fill('[data-testid="goal-description-input"]', opts.description)
  if (opts.targetDate) await page.fill('[data-testid="goal-target-date-input"]', opts.targetDate)
  await page.click('[data-testid="modal-save-btn"]')
}

async function addEntry(
  page: import('@playwright/test').Page,
  opts: {
    date?: string
    text?: string
    weight?: string
    reps?: string
    mood?: string
  }
) {
  await page.click('[data-testid="add-entry-btn"]')
  if (opts.date) await page.fill('[data-testid="entry-date-input"]', opts.date)
  if (opts.text) await page.fill('[data-testid="entry-text-input"]', opts.text)
  if (opts.weight) await page.fill('[data-testid="metric-weight-input"]', opts.weight)
  if (opts.reps) await page.fill('[data-testid="metric-reps-input"]', opts.reps)
  if (opts.mood) await page.fill('[data-testid="metric-mood-input"]', opts.mood)
  await page.click('[data-testid="save-entry-btn"]')
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('GoalFlow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearData(page)
  })

  // ── Test 1: Create and track a fitness goal ─────────────────────────────────

  test('Happy path – create and track a fitness goal', async ({ page }) => {
    await page.goto('/')

    await createGoal(page, {
      title: 'Morning Run',
      category: 'fitness',
      description: 'Daily morning run for fitness',
      targetDate: '2026-12-31',
    })

    // Screenshot: dashboard with one goal
    await captureScreenshot(page, 'dashboard')

    // Goal card appears
    await expect(page.locator('[data-testid="goal-card"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="goal-card"]')).toContainText('Morning Run')

    // Navigate to goal detail
    await page.click('[data-testid="goal-card"]')

    // Add a journal entry with weight metric
    await addEntry(page, {
      text: 'Great run today, felt strong',
      weight: '165',
    })

    // Screenshot: goal detail
    await captureScreenshot(page, 'goal-detail')

    // Entry appears in journal feed
    await expect(page.locator('[data-testid="journal-entry"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="journal-entry"]')).toContainText(
      'Great run today, felt strong'
    )

    // Chart container is visible
    await expect(page.locator('[data-testid="chart-container"]')).toBeVisible()
  })

  // ── Test 2: Multiple entries → chart trend ──────────────────────────────────

  test('Happy path – multiple journal entries generate a chart trend', async ({ page }) => {
    await page.goto('/')

    await createGoal(page, { title: 'Mood Tracking', category: 'habit' })
    await page.click('[data-testid="goal-card"]')

    await addEntry(page, { date: '2026-01-01', text: 'Feeling good', mood: '7' })
    await addEntry(page, { date: '2026-01-02', text: 'Even better', mood: '8' })
    await addEntry(page, { date: '2026-01-03', text: 'Amazing day!', mood: '9' })

    // Three journal entries visible
    await expect(page.locator('[data-testid="journal-entry"]')).toHaveCount(3)

    // SVG chart has 3 data-point circles
    const circles = page.locator('[data-testid="chart-container"] svg circle')
    await expect(circles).toHaveCount(3)
  })

  // ── Test 3: Mark goal as completed ─────────────────────────────────────────

  test('Happy path – mark goal as completed', async ({ page }) => {
    await page.goto('/')

    await createGoal(page, { title: 'Complete Me' })

    // Visible in active filter (default)
    await expect(page.locator('[data-testid="goal-card"]')).toHaveCount(1)

    // Navigate to detail and complete
    await page.click('[data-testid="goal-card"]')
    await page.click('[data-testid="mark-complete-btn"]')
    await page.click('[data-testid="back-btn"]')

    // Not visible in active filter
    await expect(page.locator('[data-testid="goal-card"]')).toHaveCount(0)

    // Visible in completed filter
    await page.click('[data-testid="filter-status-completed"]')
    await expect(page.locator('[data-testid="goal-card"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="goal-card"]')).toContainText('Complete Me')
  })

  // ── Test 4: Empty chart state when no metrics ───────────────────────────────

  test('Edge case – goal with no metrics shows empty chart state', async ({ page }) => {
    await page.goto('/')

    await createGoal(page, { title: 'Learn Piano', category: 'learning' })
    await page.click('[data-testid="goal-card"]')

    // Add entry with only text, no metrics
    await addEntry(page, { text: 'Practiced scales for 30 minutes' })

    // Empty chart state shown
    await expect(page.locator('[data-testid="empty-chart-state"]')).toBeVisible()
    await expect(page.locator('[data-testid="empty-chart-state"]')).toContainText(
      'No metrics recorded yet'
    )
  })

  // ── Test 5: Cannot create goal without a title ──────────────────────────────

  test('Edge case – cannot create a goal without a title', async ({ page }) => {
    await page.goto('/')
    await page.click('[data-testid="new-goal-fab"]')

    // Leave title blank
    await page.fill('[data-testid="goal-description-input"]', 'Some description')
    await page.fill('[data-testid="goal-target-date-input"]', '2026-12-31')
    await page.click('[data-testid="modal-save-btn"]')

    // Screenshot: validation error in modal
    await captureScreenshot(page, 'new-goal-modal')

    // Validation error shown
    await expect(page.locator('[data-testid="title-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="title-error"]')).toContainText('Title is required')

    // Modal still open – close it and verify no goal was added
    await page.click('[data-testid="modal-cancel-btn"]')
    await expect(page.locator('[data-testid="goal-card"]')).toHaveCount(0)
  })

  // ── Test 6: Data persists across reload ────────────────────────────────────

  test('Data persistence – goals survive page reload', async ({ page }) => {
    await page.goto('/')

    await createGoal(page, {
      title: 'Persistent Goal',
      category: 'fitness',
      description: 'This should persist',
    })

    await page.click('[data-testid="goal-card"]')
    await addEntry(page, { text: 'First log entry', mood: '8' })

    // Reload the page
    await page.reload()

    // Goal still exists
    await expect(page.locator('[data-testid="goal-card"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="goal-card"]')).toContainText('Persistent Goal')

    // Navigate to detail – entry still there
    await page.click('[data-testid="goal-card"]')
    await expect(page.locator('[data-testid="journal-entry"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="journal-entry"]')).toContainText('First log entry')
  })

  // ── Test 7: Export and import backup ───────────────────────────────────────

  test('Data export and import backup', async ({ page }) => {
    await page.goto('/')

    await createGoal(page, { title: 'Goal Alpha' })
    await createGoal(page, { title: 'Goal Beta' })
    await expect(page.locator('[data-testid="goal-card"]')).toHaveCount(2)

    // Export data → get downloaded file
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-btn"]'),
    ])
    const exportPath = await download.path()
    expect(exportPath).toBeTruthy()

    // Clear all data
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('[data-testid="goal-card"]')).toHaveCount(0)

    // Import the file back
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('[data-testid="import-btn"]'),
    ])
    await fileChooser.setFiles(exportPath!)

    // Goals restored
    await expect(page.locator('[data-testid="goal-card"]')).toHaveCount(2)
  })

  // ── Test 8: Dashboard filter by category ───────────────────────────────────

  test('Dashboard filter by category', async ({ page }) => {
    await page.goto('/')

    await createGoal(page, { title: 'Fitness Goal', category: 'fitness' })
    await createGoal(page, { title: 'Learning Goal', category: 'learning' })

    // Both visible with "All" filter (default)
    await expect(page.locator('[data-testid="goal-card"]')).toHaveCount(2)

    // Filter by fitness → only fitness goal shown
    await page.click('[data-testid="filter-category-fitness"]')
    await expect(page.locator('[data-testid="goal-card"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="goal-card"]')).toContainText('Fitness Goal')

    // Switch back to All → both shown
    await page.click('[data-testid="filter-category-all"]')
    await expect(page.locator('[data-testid="goal-card"]')).toHaveCount(2)
  })
})

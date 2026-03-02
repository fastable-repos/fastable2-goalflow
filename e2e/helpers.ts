import type { Page } from '@playwright/test'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const screenshotDir = join(__dirname, 'screenshots')

export async function captureScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: join(screenshotDir, `${name}.png`), fullPage: true })
}

export async function assertNoConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  // Wait a moment for any deferred errors
  await page.waitForTimeout(500)
  return errors
}

interface HealthError {
  type: 'console' | 'uncaught' | 'network' | 'content'
  message: string
  url?: string
  statusCode?: number
}

/**
 * Lightweight page health monitor for generated apps.
 * Attaches listeners for console errors, uncaught exceptions, and HTTP failures.
 *
 * Usage:
 *   const health = monitorPage(page)
 *   await page.goto('/')
 *   health.assertClean()
 */
export function monitorPage(page: Page) {
  const errors: HealthError[] = []

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push({ type: 'console', message: msg.text() })
    }
  })

  page.on('pageerror', (err) => {
    errors.push({ type: 'uncaught', message: err.message || String(err) })
  })

  page.on('response', (response) => {
    const status = response.status()
    if (status >= 400) {
      errors.push({
        type: 'network',
        message: `HTTP ${status} on ${response.url()}`,
        url: response.url(),
        statusCode: status,
      })
    }
  })

  return {
    errors,
    assertClean(message?: string) {
      if (errors.length > 0) {
        const summary = errors.map(e => `  [${e.type}] ${e.message}`).join('\n')
        throw new Error(`${message || 'Page health check failed'} — ${errors.length} error(s):\n${summary}`)
      }
    },
    clear() {
      errors.length = 0
    },
  }
}

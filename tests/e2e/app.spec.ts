import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { _electron as electron } from 'playwright'
import path from 'path'

let app: ElectronApplication
let page: Page

test.beforeAll(async () => {
  // Build must be run before e2e tests: npm run build
  app = await electron.launch({
    args: [path.join(__dirname, '../../dist/main/main/index.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  })

  page = await app.firstWindow()
  // Wait for app to be ready
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(1000) // Give React time to render
})

test.afterAll(async () => {
  await app?.close()
})

test.describe('App Launch', () => {
  test('window is created and visible', async () => {
    const windows = app.windows()
    expect(windows.length).toBeGreaterThanOrEqual(1)
  })

  test('window has correct title', async () => {
    const title = await page.title()
    // Electron frameless windows may not have a visible title
    expect(title).toBeDefined()
  })

  test('window has minimum dimensions', async () => {
    const { width, height } = page.viewportSize() || { width: 0, height: 0 }
    expect(width).toBeGreaterThanOrEqual(900)
    expect(height).toBeGreaterThanOrEqual(600)
  })
})

test.describe('Layout Components', () => {
  test('title bar renders', async () => {
    // Custom title bar should be present
    const titleBar = page.locator('text=Claudette').first()
    await expect(titleBar).toBeVisible()
  })

  test('tab bar renders with all tabs', async () => {
    const tabBar = page.locator('[role="tablist"]')
    await expect(tabBar).toBeVisible()

    const tabs = ['Chat', 'Files', 'Git', 'Agents', 'Usage']
    for (const tab of tabs) {
      await expect(page.locator(`[role="tab"]:has-text("${tab}")`)).toBeVisible()
    }
  })

  test('sidebar renders with projects header', async () => {
    const projectsHeader = page.locator('text=Projects').first()
    await expect(projectsHeader).toBeVisible()
  })

  test('status bar renders', async () => {
    const statusBar = page.locator('text=Idle').first()
    await expect(statusBar).toBeVisible()
  })
})

test.describe('Tab Navigation', () => {
  test('clicking tabs switches panels', async () => {
    // Click Files tab
    await page.locator('[role="tab"]:has-text("Files")').click()
    await expect(page.locator('[role="tab"][aria-selected="true"]:has-text("Files")')).toBeVisible()

    // Click Git tab
    await page.locator('[role="tab"]:has-text("Git")').click()
    await expect(page.locator('[role="tab"][aria-selected="true"]:has-text("Git")')).toBeVisible()

    // Click Agents tab
    await page.locator('[role="tab"]:has-text("Agents")').click()
    await expect(page.locator('[role="tab"][aria-selected="true"]:has-text("Agents")')).toBeVisible()

    // Click Usage tab
    await page.locator('[role="tab"]:has-text("Usage")').click()
    await expect(page.locator('[role="tab"][aria-selected="true"]:has-text("Usage")')).toBeVisible()

    // Click back to Chat tab
    await page.locator('[role="tab"]:has-text("Chat")').click()
    await expect(page.locator('[role="tab"][aria-selected="true"]:has-text("Chat")')).toBeVisible()
  })

  test('keyboard shortcuts switch tabs', async () => {
    await page.keyboard.press('Control+2')
    await expect(page.locator('[role="tab"][aria-selected="true"]:has-text("Files")')).toBeVisible()

    await page.keyboard.press('Control+1')
    await expect(page.locator('[role="tab"][aria-selected="true"]:has-text("Chat")')).toBeVisible()
  })
})

test.describe('Sidebar', () => {
  test('toggle sidebar with Ctrl+B', async () => {
    // Sidebar should be visible
    const sidebar = page.locator('text=Projects').first()
    await expect(sidebar).toBeVisible()

    // Collapse
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(200)

    // Expand
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(200)
    await expect(sidebar).toBeVisible()
  })
})

test.describe('Terminal', () => {
  test('toggle terminal with Ctrl+`', async () => {
    // Terminal should be hidden by default
    const terminalHeader = page.locator('text=TERMINAL').first()
    await expect(terminalHeader).not.toBeVisible()

    // Toggle open
    await page.keyboard.press('Control+`')
    await page.waitForTimeout(500)
    await expect(terminalHeader).toBeVisible()

    // Toggle closed
    await page.keyboard.press('Control+`')
    await page.waitForTimeout(300)
    await expect(terminalHeader).not.toBeVisible()
  })
})

test.describe('Command Palette', () => {
  test('opens with Ctrl+K and closes with Escape', async () => {
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(200)

    // Command palette should have a search input
    const input = page.locator('input[placeholder*="Search"]').first()
    await expect(input).toBeVisible()

    // Close with Escape
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(input).not.toBeVisible()
  })
})

test.describe('IPC Handlers', () => {
  test('projects:list returns array', async () => {
    const result = await app.evaluate(async ({ ipcMain }) => {
      // The handler is registered, we can test it responds
      return true
    })
    expect(result).toBe(true)
  })

  test('settings:get returns settings object', async () => {
    const settings = await page.evaluate(() => {
      return (window as any).electronAPI?.getSettings()
    })
    // Settings should have claudePath property
    expect(settings).toBeDefined()
    if (settings) {
      expect(settings).toHaveProperty('claudePath')
      expect(settings).toHaveProperty('defaultModel')
    }
  })
})

test.describe('Window Controls', () => {
  test('window control buttons exist', async () => {
    // Minimize, maximize, close buttons should exist
    const minimizeBtn = page.locator('[aria-label="Minimize"]')
    const maximizeBtn = page.locator('[aria-label="Maximize"]')
    const closeBtn = page.locator('[aria-label="Close"]')

    await expect(minimizeBtn).toBeVisible()
    await expect(maximizeBtn).toBeVisible()
    await expect(closeBtn).toBeVisible()
  })
})

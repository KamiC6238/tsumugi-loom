import { expect, test } from '@playwright/test'

test('creates workflows from the sidebar and switches the active canvas', async ({ page }) => {
  await page.goto('/')

  const detailPanel = page.getByTestId('workflow-detail')

  await expect(page.getByRole('button', { name: 'Create workflow' })).toBeVisible()
  await expect(detailPanel.getByRole('heading', { name: 'No workflow selected' })).toBeVisible()

  await page.getByRole('button', { name: 'Create workflow' }).click()

  const dialog = page.getByRole('dialog', { name: 'Create workflow' })

  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Workflow name').fill('Orders Intake')
  await dialog.getByRole('button', { name: 'Save workflow' }).click()

  const ordersButton = page.getByRole('button', { name: 'Orders Intake' })

  await expect(ordersButton).toHaveAttribute('aria-pressed', 'true')
  await expect(detailPanel.getByRole('heading', { name: 'Orders Intake' })).toBeVisible()
  await expect(detailPanel.getByText('Seeded for Orders Intake')).toBeVisible()
  await expect(detailPanel.getByTestId('workflow-canvas')).toBeVisible()
  await expect(detailPanel.getByText('Orders Intake review')).toBeVisible()

  await page.getByRole('button', { name: 'Create workflow' }).click()
  await dialog.getByLabel('Workflow name').fill('Approval Loop')
  await dialog.getByRole('button', { name: 'Save workflow' }).click()

  const approvalButton = page.getByRole('button', { name: 'Approval Loop' })

  await expect(approvalButton).toHaveAttribute('aria-pressed', 'true')
  await expect(ordersButton).toHaveAttribute('aria-pressed', 'false')
  await expect(detailPanel.getByRole('heading', { name: 'Approval Loop' })).toBeVisible()
  await expect(detailPanel.getByText('Seeded for Approval Loop')).toBeVisible()
  await expect(detailPanel.getByText('Approval Loop review')).toBeVisible()
  await expect(detailPanel.getByRole('heading', { name: 'Orders Intake' })).not.toBeVisible()
  await expect(detailPanel.getByText('Seeded for Orders Intake')).not.toBeVisible()
  await expect(detailPanel.getByText('Orders Intake review')).not.toBeVisible()

  await ordersButton.click()

  await expect(ordersButton).toHaveAttribute('aria-pressed', 'true')
  await expect(approvalButton).toHaveAttribute('aria-pressed', 'false')
  await expect(detailPanel.getByRole('heading', { name: 'Orders Intake' })).toBeVisible()
  await expect(detailPanel.getByText('Seeded for Orders Intake')).toBeVisible()
  await expect(detailPanel.getByText('Orders Intake review')).toBeVisible()
  await expect(detailPanel.getByRole('heading', { name: 'Approval Loop' })).not.toBeVisible()
  await expect(detailPanel.getByText('Seeded for Approval Loop')).not.toBeVisible()
  await expect(detailPanel.getByText('Approval Loop review')).not.toBeVisible()
})

test('keeps save disabled for blank workflow names', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Create workflow' }).click()

  const dialog = page.getByRole('dialog', { name: 'Create workflow' })
  const saveButton = dialog.getByRole('button', { name: 'Save workflow' })

  await expect(saveButton).toBeDisabled()

  await dialog.getByLabel('Workflow name').fill('   ')

  await expect(saveButton).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Orders Intake' })).toHaveCount(0)
})

test('makes the empty workflow state fill the detail panel content area', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')

  const detailPanel = page.getByTestId('workflow-detail')
  const emptyState = page.locator('.empty-state')

  await expect(emptyState).toBeVisible()

  const metrics = await page.evaluate(() => {
    const detailPanelElement = document.querySelector<HTMLElement>('[data-testid="workflow-detail"]')
    const emptyStateElement = document.querySelector<HTMLElement>('.empty-state')

    if (!detailPanelElement || !emptyStateElement) {
      throw new Error('Expected workflow detail panel and empty state to exist')
    }

    const styles = getComputedStyle(detailPanelElement)
    const availableHeight =
      detailPanelElement.clientHeight
      - parseFloat(styles.paddingTop)
      - parseFloat(styles.paddingBottom)

    return {
      availableHeight,
      emptyStateHeight: emptyStateElement.clientHeight,
    }
  })

  expect(Math.abs(metrics.emptyStateHeight - metrics.availableHeight)).toBeLessThanOrEqual(2)
  await expect(detailPanel).toContainText('No workflow selected')
})

test('keeps the page fixed and scrolls only the workflow list when many workflows exist', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')

  const createButton = page.getByRole('button', { name: 'Create workflow' })
  const createDialog = page.getByRole('dialog', { name: 'Create workflow' })

  for (let index = 1; index <= 18; index += 1) {
    await createButton.click()
    await createDialog.getByLabel('Workflow name').fill(`Workflow ${index}`)
    await createDialog.getByRole('button', { name: 'Save workflow' }).click()
  }

  const pageOverflows = await page.evaluate(
    () => document.documentElement.scrollHeight > window.innerHeight,
  )

  expect(pageOverflows).toBe(false)

  const workflowListSection = page.locator('.workflow-list-section')
  const workflowList = page.locator('.workflow-list')

  await expect(workflowListSection).toBeVisible()
  await expect(workflowList).toBeVisible()

  const scrollMetrics = await workflowList.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }))

  expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.clientHeight)

  const sectionMetrics = await workflowListSection.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }))

  expect(sectionMetrics.scrollHeight).toBe(sectionMetrics.clientHeight)
})

test('keeps workflow items content-sized when the list has extra vertical space', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')

  const createButton = page.getByRole('button', { name: 'Create workflow' })
  const createDialog = page.getByRole('dialog', { name: 'Create workflow' })

  for (const name of ['111', '222']) {
    await createButton.click()
    await createDialog.getByLabel('Workflow name').fill(name)
    await createDialog.getByRole('button', { name: 'Save workflow' }).click()
  }

  const itemHeights = await page.locator('.workflow-list > li').evaluateAll((items) =>
    items.map((item) => item.getBoundingClientRect().height),
  )

  expect(itemHeights).toHaveLength(2)
  expect(itemHeights[0]).toBeLessThan(120)
  expect(itemHeights[1]).toBeLessThan(120)
})

test('saves node changes and closes the drawer when clicking save', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Create workflow' }).click()

  const createDialog = page.getByRole('dialog', { name: 'Create workflow' })

  await createDialog.getByLabel('Workflow name').fill('Orders Intake')
  await createDialog.getByRole('button', { name: 'Save workflow' }).click()

  const detailPanel = page.getByTestId('workflow-detail')

  await detailPanel.getByText('Orders Intake review').click()

  const nodeDrawer = page.getByRole('dialog', { name: 'Edit node' })
  const nodeNameInput = nodeDrawer.getByLabel('Node name')

  await expect(nodeDrawer).toBeVisible()
  await expect(nodeNameInput).toHaveValue('Orders Intake review')

  await nodeNameInput.fill('  Manual review  ')
  await nodeDrawer.getByRole('button', { name: 'Save node' }).click()

  await expect(nodeDrawer).not.toBeVisible()
  await expect(detailPanel.getByText('Manual review')).toBeVisible()
  await expect(detailPanel.getByText('Orders Intake review')).not.toBeVisible()
})

test('saves node changes and closes the drawer when pressing enter', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Create workflow' }).click()

  const createDialog = page.getByRole('dialog', { name: 'Create workflow' })

  await createDialog.getByLabel('Workflow name').fill('Orders Intake')
  await createDialog.getByRole('button', { name: 'Save workflow' }).click()

  const detailPanel = page.getByTestId('workflow-detail')

  await detailPanel.getByText('Orders Intake review').click()

  const nodeDrawer = page.getByRole('dialog', { name: 'Edit node' })
  const nodeNameInput = nodeDrawer.getByLabel('Node name')

  await expect(nodeDrawer).toBeVisible()

  await nodeNameInput.fill('  Async review  ')
  await nodeNameInput.press('Enter')

  await expect(nodeDrawer).not.toBeVisible()
  await expect(detailPanel.getByText('Async review')).toBeVisible()
  await expect(detailPanel.getByText('Orders Intake review')).not.toBeVisible()
})

test('closes the node drawer when clicking outside it', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Create workflow' }).click()

  const createDialog = page.getByRole('dialog', { name: 'Create workflow' })

  await createDialog.getByLabel('Workflow name').fill('Orders Intake')
  await createDialog.getByRole('button', { name: 'Save workflow' }).click()

  const detailPanel = page.getByTestId('workflow-detail')

  await detailPanel.getByText('Orders Intake review').click()

  const nodeDrawer = page.getByRole('dialog', { name: 'Edit node' })

  await expect(nodeDrawer).toBeVisible()

  await detailPanel.getByRole('heading', { name: 'Orders Intake' }).click()

  await expect(nodeDrawer).not.toBeVisible()
})

test('clears the node drawer state when switching workflows', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Create workflow' }).click()

  const createDialog = page.getByRole('dialog', { name: 'Create workflow' })

  await createDialog.getByLabel('Workflow name').fill('Orders Intake')
  await createDialog.getByRole('button', { name: 'Save workflow' }).click()

  await page.getByRole('button', { name: 'Create workflow' }).click()
  await createDialog.getByLabel('Workflow name').fill('Approval Loop')
  await createDialog.getByRole('button', { name: 'Save workflow' }).click()

  const ordersButton = page.getByRole('button', { name: 'Orders Intake' })
  const approvalButton = page.getByRole('button', { name: 'Approval Loop' })
  const detailPanel = page.getByTestId('workflow-detail')

  await ordersButton.click()
  await detailPanel.getByText('Orders Intake review').click()

  const nodeDrawer = page.getByRole('dialog', { name: 'Edit node' })

  await expect(nodeDrawer).toBeVisible()

  await approvalButton.click()

  await expect(nodeDrawer).not.toBeVisible()
  await expect(approvalButton).toHaveAttribute('aria-pressed', 'true')
  await expect(ordersButton).toHaveAttribute('aria-pressed', 'false')
  await expect(detailPanel.getByRole('heading', { name: 'Approval Loop' })).toBeVisible()

  await ordersButton.click()

  await expect(nodeDrawer).not.toBeVisible()
  await expect(ordersButton).toHaveAttribute('aria-pressed', 'true')
  await expect(approvalButton).toHaveAttribute('aria-pressed', 'false')
  await expect(detailPanel.getByRole('heading', { name: 'Orders Intake' })).toBeVisible()

  await detailPanel.getByText('Orders Intake review').click()

  await expect(nodeDrawer).toBeVisible()
})

test('clears the selected node when closing the drawer', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Create workflow' }).click()

  const createDialog = page.getByRole('dialog', { name: 'Create workflow' })

  await createDialog.getByLabel('Workflow name').fill('Orders Intake')
  await createDialog.getByRole('button', { name: 'Save workflow' }).click()

  await page.getByRole('button', { name: 'Create workflow' }).click()
  await createDialog.getByLabel('Workflow name').fill('Approval Loop')
  await createDialog.getByRole('button', { name: 'Save workflow' }).click()

  const ordersButton = page.getByRole('button', { name: 'Orders Intake' })
  const approvalButton = page.getByRole('button', { name: 'Approval Loop' })
  const detailPanel = page.getByTestId('workflow-detail')

  await ordersButton.click()
  await detailPanel.getByText('Orders Intake review').click()

  const nodeDrawer = page.getByRole('dialog', { name: 'Edit node' })

  await expect(nodeDrawer).toBeVisible()

  await nodeDrawer.getByRole('button', { name: 'Close' }).click()

  await expect(nodeDrawer).not.toBeVisible()

  await approvalButton.click()
  await ordersButton.click()

  await expect(nodeDrawer).not.toBeVisible()

  await detailPanel.getByText('Orders Intake review').click()

  await expect(nodeDrawer).toBeVisible()
})

test('shows added node skills in the node drawer select', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('open-skills-panel').click()
  await page.getByRole('switch', { name: 'start-standard-workflow added' }).click()
  await page.getByRole('switch', { name: 'git-commit-push added' }).click()

  await page.getByRole('button', { name: 'Create workflow' }).click()

  const createDialog = page.getByRole('dialog', { name: 'Create workflow' })

  await createDialog.getByLabel('Workflow name').fill('Orders Intake')
  await createDialog.getByRole('button', { name: 'Save workflow' }).click()

  const detailPanel = page.getByTestId('workflow-detail')

  await detailPanel.getByText('Orders Intake review').click()

  const nodeDrawer = page.getByRole('dialog', { name: 'Edit node' })
  const nodeSkillSelect = nodeDrawer.getByLabel('Node skill')

  await expect(nodeDrawer).toBeVisible()
  await expect(nodeSkillSelect).toBeEnabled()
  await expect(nodeSkillSelect.locator('option')).toHaveText(['No node skill', 'git-commit-push'])

  await nodeSkillSelect.selectOption('git-commit-push')
  await nodeDrawer.getByRole('button', { name: 'Save node' }).click()

  await expect(nodeDrawer).not.toBeVisible()
})

test('switches from the skills panel to the selected workflow from the sidebar', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Create workflow' }).click()

  const createDialog = page.getByRole('dialog', { name: 'Create workflow' })

  await createDialog.getByLabel('Workflow name').fill('Orders Intake')
  await createDialog.getByRole('button', { name: 'Save workflow' }).click()

  const workflowButton = page.getByRole('button', { name: 'Orders Intake' })

  await page.getByTestId('open-skills-panel').click()

  await expect(page.getByTestId('skills-panel')).toBeVisible()

  await workflowButton.click()

  const detailPanel = page.getByTestId('workflow-detail')

  await expect(page.getByTestId('skills-panel')).not.toBeVisible()
  await expect(detailPanel.getByRole('heading', { name: 'Orders Intake' })).toBeVisible()
})

test('keeps skill card text contained inside cards across viewports', async ({ page }) => {
  async function expectSkillCardsToContainText() {
    await page.goto('/')
    await page.getByTestId('open-skills-panel').click()

    const skillCards = page.locator('.skill-card')

    await expect(skillCards.first()).toBeVisible()

    const overflowingItems = await skillCards.evaluateAll((cards) =>
      cards.flatMap((card, cardIndex) => {
        const cardRect = card.getBoundingClientRect()
        const textElements = Array.from(
          card.querySelectorAll<HTMLElement>('.skill-name, .skill-description, .skill-path'),
        )

        return textElements
          .filter((element) => {
            const elementRect = element.getBoundingClientRect()

            return (
              element.scrollWidth > element.clientWidth + 1
              || elementRect.left < cardRect.left - 1
              || elementRect.right > cardRect.right + 1
            )
          })
          .map((element) => `${cardIndex}:${element.className}`)
      }),
    )

    expect(overflowingItems).toEqual([])
  }

  await page.setViewportSize({ width: 1280, height: 900 })
  await expectSkillCardsToContainText()

  await page.setViewportSize({ width: 390, height: 844 })
  await expectSkillCardsToContainText()
})
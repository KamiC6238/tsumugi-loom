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
import { expect, test } from '@playwright/test'

test('keeps workflow selection in sync between the canvas and side panel', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('[data-testid^="stage-node-"]')).toHaveCount(4)
  await expect(page.getByTestId('stage-node-plan')).toBeVisible()

  await expect(page.getByTestId('selected-stage-title')).toHaveText('TDD Coding')
  await expect(page.getByTestId('stage-node-coding')).toHaveAttribute('data-selected', 'true')
  await expect(page.locator('.vue-flow__handle')).toHaveCount(0)

  await page.getByTestId('stage-list-review').click()
  await expect(page.getByTestId('selected-stage-title')).toHaveText('Code Review')
  await expect(page.getByTestId('stage-node-review')).toHaveAttribute('data-selected', 'true')
  await expect(page.getByTestId('stage-node-coding')).toHaveAttribute('data-selected', 'false')
  await expect(page.getByTestId('review-handoff-summary')).toContainText('approved in round 3')
  await expect(page.getByTestId('review-findings-list')).toContainText('首轮 review 发现画布选中态')
  await expect(page.getByTestId('review-follow-up-empty')).toContainText(
    'No unresolved review issues remain in the current artifact.',
  )

  await page.getByTestId('stage-node-test').click()
  await expect(page.getByTestId('selected-stage-title')).toHaveText('Testing')
  await expect(page.getByTestId('stage-node-test')).toHaveAttribute('data-selected', 'true')
})
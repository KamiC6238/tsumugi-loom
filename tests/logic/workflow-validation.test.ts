import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { validateWorkflow } from '../../scripts/loom/workflow.mjs'

const currentFilePath = fileURLToPath(import.meta.url)
const currentDirPath = path.dirname(currentFilePath)
const repoRoot = path.resolve(currentDirPath, '..', '..')
const workflowsRoot = path.join(repoRoot, 'artifacts', 'workflows')
const fixtureWorkflowId = '20260425-095256-vue-flow-mvp-five-node-dag-spike'
const fixtureWorkflowPath = path.join(workflowsRoot, fixtureWorkflowId)

async function replaceWorkflowIdInBundle(bundlePath: string, nextWorkflowId: string) {
  const entries = await fs.readdir(bundlePath)

  await Promise.all(
    entries.map(async (entryName) => {
      const filePath = path.join(bundlePath, entryName)
      const stats = await fs.stat(filePath)

      if (!stats.isFile()) {
        return
      }

      const content = await fs.readFile(filePath, 'utf8')
      await fs.writeFile(filePath, content.replaceAll(fixtureWorkflowId, nextWorkflowId), 'utf8')
    }),
  )
}

async function cloneWorkflowFixture() {
  const nextWorkflowId = `20990101-000000-${randomUUID().slice(0, 8)}`
  const nextWorkflowPath = path.join(workflowsRoot, nextWorkflowId)

  await fs.cp(fixtureWorkflowPath, nextWorkflowPath, { recursive: true })
  await replaceWorkflowIdInBundle(nextWorkflowPath, nextWorkflowId)

  return {
    workflowId: nextWorkflowId,
    workflowPath: nextWorkflowPath,
  }
}

describe('validateWorkflow', () => {
  it('accepts the completed Vue Flow spike workflow bundle', async () => {
    const result = await validateWorkflow(fixtureWorkflowId)

    expect(result.issues).toEqual([])
  })

  it('rejects ready workflows whose test review is not approved', async () => {
    const { workflowId, workflowPath } = await cloneWorkflowFixture()

    try {
      const testReviewPath = path.join(workflowPath, 'test-review.md')
      const content = await fs.readFile(testReviewPath, 'utf8')
      await fs.writeFile(
        testReviewPath,
        content.replace('Review Status: approved', 'Review Status: changes_requested'),
        'utf8',
      )

      const result = await validateWorkflow(workflowId)

      expect(result.issues).toContain(
        'test-review.md 的 Review Status 必须为 approved，workflow 才能结束 Coding',
      )
    } finally {
      await fs.rm(workflowPath, { recursive: true, force: true })
    }
  })

  it('accepts a third-round review handoff that proceeds with known issues', async () => {
    const { workflowId, workflowPath } = await cloneWorkflowFixture()

    try {
      const reviewPath = path.join(workflowPath, 'review.md')
      const content = await fs.readFile(reviewPath, 'utf8')
      const nextContent = content
        .replace('Review Status: approved', 'Review Status: changes_requested')
        .replace('Review Disposition: approved', 'Review Disposition: proceed_with_known_issues')
        .replace(
          /## Required Rework\n\n1\. 无。\n\n## Resolution Notes/,
          '## Required Rework\n\n1. Let a human decide whether the remaining UI polish belongs in this spike.\n\n## Resolution Notes',
        )

      await fs.writeFile(reviewPath, nextContent, 'utf8')

      const result = await validateWorkflow(workflowId)

      expect(result.issues).toEqual([])
      expect(result.warnings).toContain(
        'review.md 在第 3 轮后带着已知问题继续进入 reconcile；请在界面中展示 Required Rework 并允许人工介入',
      )
    } finally {
      await fs.rm(workflowPath, { recursive: true, force: true })
    }
  })

  it('rejects review handoffs that try to proceed before the third round', async () => {
    const { workflowId, workflowPath } = await cloneWorkflowFixture()

    try {
      const reviewPath = path.join(workflowPath, 'review.md')
      const content = await fs.readFile(reviewPath, 'utf8')
      const nextContent = content
        .replace('Review Status: approved', 'Review Status: changes_requested')
        .replace('Review Round: 3', 'Review Round: 2')
        .replace('Review Disposition: approved', 'Review Disposition: proceed_with_known_issues')
        .replace(
          /## Required Rework\n\n1\. 无。\n\n## Resolution Notes/,
          '## Required Rework\n\n1. A human still needs to triage this item.\n\n## Resolution Notes',
        )

      await fs.writeFile(reviewPath, nextContent, 'utf8')

      const result = await validateWorkflow(workflowId)

      expect(result.issues).toContain(
        'review.md 在前 2 轮为 changes_requested 时，Review Disposition 必须为 rework_required',
      )
      expect(result.issues).toContain(
        'review.md 只有在 approved，或第 3 轮 changes_requested 且 Review Disposition = proceed_with_known_issues 时，workflow 才能进入 reconcile',
      )
    } finally {
      await fs.rm(workflowPath, { recursive: true, force: true })
    }
  })

  it('rejects knowledge delta bundles that violate the documented minimum shape', async () => {
    const { workflowId, workflowPath } = await cloneWorkflowFixture()

    try {
      const knowledgeDeltaPath = path.join(workflowPath, 'knowledge-delta.json')
      const rawKnowledgeDelta = await fs.readFile(knowledgeDeltaPath, 'utf8')
      const knowledgeDelta = JSON.parse(rawKnowledgeDelta)

      delete knowledgeDelta.confidence
      knowledgeDelta.affectedAreas = {}

      await fs.writeFile(knowledgeDeltaPath, `${JSON.stringify(knowledgeDelta, null, 2)}\n`, 'utf8')

      const result = await validateWorkflow(workflowId)

      expect(result.issues).toContain('knowledge-delta.json 中的 affectedAreas 必须是数组')
      expect(result.issues).toContain('knowledge-delta.json 缺少 confidence 字段')
    } finally {
      await fs.rm(workflowPath, { recursive: true, force: true })
    }
  })

  it('rejects knowledge delta bundles whose sourceNodeIds drift from the canonical DAG', async () => {
    const { workflowId, workflowPath } = await cloneWorkflowFixture()

    try {
      const knowledgeDeltaPath = path.join(workflowPath, 'knowledge-delta.json')
      const rawKnowledgeDelta = await fs.readFile(knowledgeDeltaPath, 'utf8')
      const knowledgeDelta = JSON.parse(rawKnowledgeDelta)

      knowledgeDelta.sourceNodeIds = ['plan', 'coding', 'test', 'review', 'reconcile']

      await fs.writeFile(knowledgeDeltaPath, `${JSON.stringify(knowledgeDelta, null, 2)}\n`, 'utf8')

      const result = await validateWorkflow(workflowId)

      expect(result.issues).toContain(
        'knowledge-delta.json 中的 sourceNodeIds 必须为: plan, coding, test, review, docs-reconciler',
      )
    } finally {
      await fs.rm(workflowPath, { recursive: true, force: true })
    }
  })

  it('rejects malformed candidate facts as issues instead of throwing', async () => {
    const { workflowId, workflowPath } = await cloneWorkflowFixture()

    try {
      const knowledgeDeltaPath = path.join(workflowPath, 'knowledge-delta.json')
      const rawKnowledgeDelta = await fs.readFile(knowledgeDeltaPath, 'utf8')
      const knowledgeDelta = JSON.parse(rawKnowledgeDelta)

      knowledgeDelta.candidateFacts = ['bad']

      await fs.writeFile(knowledgeDeltaPath, `${JSON.stringify(knowledgeDelta, null, 2)}\n`, 'utf8')

      const result = await validateWorkflow(workflowId)

      expect(result.issues).toContain('candidateFacts[0] 必须是对象')
    } finally {
      await fs.rm(workflowPath, { recursive: true, force: true })
    }
  })
})
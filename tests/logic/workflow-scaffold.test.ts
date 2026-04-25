import fs from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { createWorkflowScaffold } from '../../scripts/loom/workflow.mjs'

describe('createWorkflowScaffold', () => {
  it('records docs reconciler references in the generated manifest', async () => {
    const { workflowPath, manifest } = await createWorkflowScaffold({
      slug: 'docs-reconciler-contract',
      goal: 'Verify docs reconciler contract in scaffold manifest.',
    })

    try {
      expect(manifest).toMatchObject({
        docsReconcilerGuide: 'docs/process/DOCS_RECONCILE_WORKFLOW.zh-CN.md',
        docsReconcilerSkill: '.github/skills/docs-reconciler/SKILL.md',
      })

      const manifestPath = path.join(workflowPath, 'manifest.json')
      const rawManifest = await fs.readFile(manifestPath, 'utf8')
      const parsedManifest = JSON.parse(rawManifest)

      expect(parsedManifest).toMatchObject({
        docsReconcilerGuide: 'docs/process/DOCS_RECONCILE_WORKFLOW.zh-CN.md',
        docsReconcilerSkill: '.github/skills/docs-reconciler/SKILL.md',
      })
    } finally {
      await fs.rm(workflowPath, { recursive: true, force: true })
    }
  })
})
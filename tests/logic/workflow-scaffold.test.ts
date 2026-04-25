import fs from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  createWorkflowScaffold,
  normalizeWorkflowManifest,
} from '../../scripts/loom/workflow.mjs'

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

      const workflowEntries = (await fs.readdir(workflowPath)).sort()

      expect(workflowEntries).toEqual(['manifest.json', 'plan.md'])
      expect(parsedManifest).toMatchObject({
        artifactFiles: ['plan.md'],
      })
      expect(parsedManifest.optionalArtifactFiles).toEqual([
        'tdd-cycle.md',
        'test-review.md',
        'code-change.md',
        'test-report.md',
        'review.md',
        'knowledge-delta.json',
        'reconciliation.md',
      ])
    } finally {
      await fs.rm(workflowPath, { recursive: true, force: true })
    }
  })

  it('normalizes legacy manifest metadata to the lightweight workflow contract', () => {
    const normalizedManifest = normalizeWorkflowManifest({
      workflowId: '20260424-181535-scaffold-smoke-test',
      slug: 'scaffold-smoke-test',
      goal: '验证 workflow 自动化',
      status: 'knowledge_base_updated',
      createdAt: '2026-04-24T10:15:35.610Z',
      planSchema: 'docs/process/PLAN_ARTIFACT_SCHEMA.zh-CN.md',
      planJsonSchema: 'docs/process/plan-artifact.schema.json',
      clarificationGuide: 'docs/process/CLARIFICATION_ARTIFACT.zh-CN.md',
      planningSkill: '.github/skills/plan-writer/SKILL.md',
      codingGuide: 'docs/process/TDD_CODING_WORKFLOW.zh-CN.md',
      reviewGuide: 'docs/process/CODE_REVIEW_WORKFLOW.zh-CN.md',
      docsReconcilerGuide: 'docs/process/DOCS_RECONCILE_WORKFLOW.zh-CN.md',
      codingSkill: '.github/skills/tdd-coding-writer/SKILL.md',
      reviewSkill: '.github/skills/code-review-writer/SKILL.md',
      docsReconcilerSkill: '.github/skills/docs-reconciler/SKILL.md',
      testReviewerAgent: '.github/agents/test-case-reviewer.agent.md',
      codeReviewerAgent: '.github/agents/code-reviewer.agent.md',
      sourceDesignDocs: [
        'TSUMUGI_LOOM_DISCUSSION_SUMMARY.zh-CN.md',
        'TSUMUGI_LOOM_KNOWLEDGE_BASE_PROPOSAL.zh-CN.md',
      ],
      canonicalDocs: [
        'ARCHITECTURE.md',
        'docs/CONVENTIONS.md',
        'docs/DOMAIN.md',
        'docs/decisions/',
        'docs/generated/run-knowledge/',
      ],
      updatedCanonicalDocs: ['docs/CONVENTIONS.md'],
    })

    expect(normalizedManifest).toMatchObject({
      planGuide: 'docs/process/PLAN_ARTIFACT_SCHEMA.zh-CN.md',
      artifactFiles: ['plan.md'],
      optionalArtifactFiles: [
        'tdd-cycle.md',
        'test-review.md',
        'code-change.md',
        'test-report.md',
        'review.md',
        'knowledge-delta.json',
        'reconciliation.md',
      ],
    })
    expect(normalizedManifest).not.toHaveProperty('planSchema')
    expect(normalizedManifest).not.toHaveProperty('planJsonSchema')
    expect(normalizedManifest).not.toHaveProperty('clarificationGuide')
  })
})
 import { describe, expect, it } from 'vitest'

import {
  getStageById,
  getWorkflowStages,
  summarizeWorkflow,
  type WorkflowStage,
  type WorkflowStageId,
  workflowConnections,
  workflowStageStatusLabels,
} from '../../src/lib/workflowGraph'

describe('workflowGraph', () => {
  it('keeps the MVP DAG in a stable five-stage order', () => {
    const stages = getWorkflowStages()

    expect(stages.map((stage) => stage.id)).toEqual([
      'plan',
      'coding',
      'test',
      'review',
      'docs-reconciler',
    ])

    expect(stages.map((stage) => stage.order)).toEqual([1, 2, 3, 4, 5])

    expect(workflowConnections).toEqual([
      { source: 'plan', target: 'coding', handoff: 'ready PlanArtifact' },
      { source: 'coding', target: 'test', handoff: 'code + tests' },
      { source: 'test', target: 'review', handoff: 'test-report.md' },
      { source: 'review', target: 'docs-reconciler', handoff: 'review.md handoff' },
    ])
  })

  it('summarizes the current spike state for dashboard rendering', () => {
    expect(summarizeWorkflow()).toEqual({
      totalStages: 5,
      completedStages: 1,
      runningStages: 1,
      queuedStages: 2,
      blockedStages: 1,
      activeStageId: 'coding',
      outputArtifacts: 13,
    })
  })

  it('derives summary counts from the stages it receives', () => {
    const customStages: WorkflowStage[] = [
      {
        id: 'plan',
        order: 1,
        title: 'Plan',
        skill: 'plan-writer',
        reviewer: null,
        goal: 'Plan custom request',
        entryCriteria: 'User request exists.',
        actionLabel: 'Plan it',
        status: 'completed',
        outputs: ['plan.md'],
      },
      {
        id: 'coding',
        order: 2,
        title: 'Coding',
        skill: 'tdd-coding-writer',
        reviewer: 'Test Case Reviewer',
        goal: 'Code custom request',
        entryCriteria: 'Plan is ready.',
        actionLabel: 'Code it',
        status: 'blocked',
        outputs: ['code-change.md', 'test-review.md'],
      },
      {
        id: 'test',
        order: 3,
        title: 'Test',
        skill: 'Vitest + Playwright',
        reviewer: null,
        goal: 'Test custom request',
        entryCriteria: 'Code exists.',
        actionLabel: 'Test it',
        status: 'queued',
        outputs: ['test-report.md', 'coverage.txt', 'trace.zip'],
      },
    ]

    expect(summarizeWorkflow(customStages)).toEqual({
      totalStages: 3,
      completedStages: 1,
      runningStages: 0,
      queuedStages: 1,
      blockedStages: 1,
      activeStageId: null,
      outputArtifacts: 6,
    })
  })

  it('keeps gate metadata attached to review and docs reconciler stages', () => {
    expect(getStageById('review')).toMatchObject({
      reviewer: 'Code Reviewer',
      skill: 'code-review-writer',
      actionLabel: 'Capture capped review verdict',
      status: 'queued',
    })

    expect(getStageById('docs-reconciler')).toMatchObject({
      reviewer: null,
      skill: 'docs-reconciler',
      status: 'blocked',
      entryCriteria: expect.stringContaining('review.md is approved or after round 3'),
    })

    expect(workflowStageStatusLabels).toEqual({
      completed: 'Completed',
      running: 'Running',
      queued: 'Queued',
      blocked: 'Blocked',
    })
  })

  it('returns defensive copies so UI mutations do not leak into the baseline graph', () => {
    const stages = getWorkflowStages()
    stages[0].title = 'Mutated title'
    stages[0].outputs.push('mutated-output.md')

    const planStage = getStageById('plan')
    planStage?.outputs.push('another-mutation.md')

    expect(getWorkflowStages()[0]).toMatchObject({
      title: 'Plan',
      outputs: ['plan.md', 'plan.json', 'clarification.md'],
    })

    expect(getStageById('plan')).toMatchObject({
      title: 'Plan',
      outputs: ['plan.md', 'plan.json', 'clarification.md'],
    })
  })

  it('returns undefined for unknown runtime ids', () => {
    expect(getStageById('unknown-stage' as WorkflowStageId)).toBeUndefined()
  })

  it('returns runtime lookup data for active and downstream stages', () => {
    const summary = summarizeWorkflow()

    expect(summary.activeStageId).toBe('coding')
    expect(getStageById(summary.activeStageId as WorkflowStageId)).toMatchObject({
      id: 'coding',
      title: 'Coding',
      status: 'running',
    })

    expect(getStageById('test')).toMatchObject({
      id: 'test',
      title: 'Test',
      status: 'queued',
      outputs: ['test-report.md'],
    })
  })
})
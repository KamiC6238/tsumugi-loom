export type WorkflowStageId = 'plan' | 'coding' | 'test' | 'review' | 'docs-reconciler'

export type WorkflowStageStatus = 'completed' | 'running' | 'queued' | 'blocked'

export interface WorkflowStage {
  id: WorkflowStageId
  order: number
  title: string
  skill: string
  reviewer: string | null
  goal: string
  entryCriteria: string
  actionLabel: string
  status: WorkflowStageStatus
  outputs: string[]
}

export interface WorkflowConnection {
  source: WorkflowStageId
  target: WorkflowStageId
  handoff: string
}

export const workflowStageStatusLabels: Record<WorkflowStageStatus, string> = {
  completed: 'Completed',
  running: 'Running',
  queued: 'Queued',
  blocked: 'Blocked',
}

const baseWorkflowStages: readonly WorkflowStage[] = [
  {
    id: 'plan',
    order: 1,
    title: 'Plan',
    skill: 'plan-writer',
    reviewer: null,
    goal: 'Turn the request into a ready handoff contract before any code is touched.',
    entryCriteria: 'Starts from raw user intent and stops the run if clarification is still open.',
    actionLabel: 'Generate plan artifacts',
    status: 'completed',
    outputs: ['plan.md', 'plan.json', 'clarification.md'],
  },
  {
    id: 'coding',
    order: 2,
    title: 'Coding',
    skill: 'tdd-coding-writer',
    reviewer: 'Test Case Reviewer',
    goal: 'Write tests first, ship the smallest passing implementation, then refactor.',
    entryCriteria: 'Requires plan.json.planStatus = ready and a resolved clarification artifact.',
    actionLabel: 'Run TDD loop',
    status: 'running',
    outputs: [
      'source changes',
      'logic and UI tests',
      'tdd-cycle.md',
      'test-review.md',
      'code-change.md',
    ],
  },
  {
    id: 'test',
    order: 3,
    title: 'Test',
    skill: 'Vitest + Playwright',
    reviewer: null,
    goal: 'Run the full suite after coding to catch regressions across all plan steps.',
    entryCriteria: 'Waits for Coding to finish with reviewer-approved tests and implementation.',
    actionLabel: 'Execute regression suite',
    status: 'queued',
    outputs: ['test-report.md'],
  },
  {
    id: 'review',
    order: 4,
    title: 'Review',
    skill: 'code-review-writer',
    reviewer: 'Code Reviewer',
    goal: 'Run up to three independent review rounds, then hand any remaining follow-up items to a human.',
    entryCriteria: 'Requires filled coding and test artifacts plus a verifiable code state.',
    actionLabel: 'Capture capped review verdict',
    status: 'queued',
    outputs: ['review.md'],
  },
  {
    id: 'docs-reconciler',
    order: 5,
    title: 'Docs Reconciler',
    skill: 'Docs Reconciler',
    reviewer: null,
    goal: 'Generate run knowledge and apply minimal knowledge-base updates from verified facts.',
    entryCriteria:
      'Enters after review.md is approved or after round 3 records known follow-up items for a human.',
    actionLabel: 'Reconcile knowledge base',
    status: 'blocked',
    outputs: ['knowledge-delta.json', 'reconciliation.md', 'run-knowledge entry'],
  },
] as const

export const workflowConnections: readonly WorkflowConnection[] = [
  { source: 'plan', target: 'coding', handoff: 'ready PlanArtifact' },
  { source: 'coding', target: 'test', handoff: 'code + tests' },
  { source: 'test', target: 'review', handoff: 'test-report.md' },
  { source: 'review', target: 'docs-reconciler', handoff: 'review.md handoff' },
] as const

export function getWorkflowStages(): WorkflowStage[] {
  return baseWorkflowStages.map((stage) => ({
    ...stage,
    outputs: [...stage.outputs],
  }))
}

export function getStageById(stageId: WorkflowStageId): WorkflowStage | undefined {
  const stage = baseWorkflowStages.find((candidate) => candidate.id === stageId)

  if (!stage) {
    return undefined
  }

  return {
    ...stage,
    outputs: [...stage.outputs],
  }
}

export function summarizeWorkflow(stages: readonly WorkflowStage[] = baseWorkflowStages) {
  const totalStages = stages.length
  const completedStages = stages.filter((stage) => stage.status === 'completed').length
  const runningStages = stages.filter((stage) => stage.status === 'running').length
  const queuedStages = stages.filter((stage) => stage.status === 'queued').length
  const blockedStages = stages.filter((stage) => stage.status === 'blocked').length
  const activeStageId = stages.find((stage) => stage.status === 'running')?.id ?? null
  const outputArtifacts = stages.reduce((total, stage) => total + stage.outputs.length, 0)

  return {
    totalStages,
    completedStages,
    runningStages,
    queuedStages,
    blockedStages,
    activeStageId,
    outputArtifacts,
  }
}
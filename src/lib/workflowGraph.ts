export type WorkflowStageId = 'plan' | 'coding' | 'test' | 'review'

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
    goal: 'Turn the request into a structured plan that Coding, Testing, and Review can consume directly.',
    entryCriteria: 'Starts from raw user intent and ends with a complete plan.md.',
    actionLabel: 'Generate plan.md',
    status: 'completed',
    outputs: ['plan.md'],
  },
  {
    id: 'coding',
    order: 2,
    title: 'TDD Coding',
    skill: 'tdd-coding-writer',
    reviewer: 'Test Case Reviewer',
    goal: 'Implement each plan step with selective TDD or alternative validation, then update the coding artifacts in the workflow directory.',
    entryCriteria: 'Uses plan.md task breakdown, acceptance criteria, and test strategy as the handoff.',
    actionLabel: 'Run TDD implementation loop',
    status: 'running',
    outputs: ['tdd-cycle.md', 'test-review.md', 'code-change.md'],
  },
  {
    id: 'test',
    order: 3,
    title: 'Testing',
    skill: 'pnpm test:all',
    reviewer: null,
    goal: 'Run every automated test case after coding to catch regressions across the whole workflow.',
    entryCriteria: 'Starts after Coding records the current implementation and validation state.',
    actionLabel: 'Run pnpm test:all',
    status: 'queued',
    outputs: ['test-report.md'],
  },
  {
    id: 'review',
    order: 4,
    title: 'Code Review',
    skill: 'code-review-writer',
    reviewer: 'Code Reviewer',
    goal: 'Run independent review rounds, capture the final review conclusion, and surface any human follow-up.',
    entryCriteria: 'Starts from plan.md, implementation evidence, test-report.md, and a verifiable code state.',
    actionLabel: 'Capture review verdict',
    status: 'blocked',
    outputs: ['review.md'],
  },
] as const

export const workflowConnections: readonly WorkflowConnection[] = [
  { source: 'plan', target: 'coding', handoff: 'plan.md handoff' },
  { source: 'coding', target: 'test', handoff: 'coding artifacts' },
  { source: 'test', target: 'review', handoff: 'test-report.md' },
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
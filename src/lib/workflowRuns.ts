import type { Edge, Node } from '@vue-flow/core'

import type { GithubIssue } from '@/lib/github'
import { getWorkflowNodeConfig } from '@/lib/workflows'
import type { WorkflowRecord } from '@/lib/workflows'

export const DEFAULT_WORKFLOW_RUNNER_ENDPOINT = 'http://127.0.0.1:43117/runs'
export const DEFAULT_MAX_REVIEW_ROUNDS = 3

export interface ExecutableWorkflowNode {
  order: number
  nodeId: string
  name: string
  skillId: string | null
}

export interface WorkflowRunReadiness {
  canRun: boolean
  nodes: ExecutableWorkflowNode[]
  missingSkillNodeNames: string[]
  message: string | null
}

export interface WorkflowRunRequest {
  runId: string
  createdAt: string
  issue: GithubIssue
  workflow: {
    id: string
    name: string
    nodes: ExecutableWorkflowNode[]
    edges: Array<Pick<Edge, 'id' | 'source' | 'target'>>
  }
  options: {
    maxReviewRounds: number
    freshSessionPerNode: true
    skillInjection: 'snapshot-skill-directory'
  }
}

export interface CreateWorkflowRunRequestInput {
  issue: GithubIssue
  workflow: WorkflowRecord
  now?: Date
  randomSuffix?: string
  maxReviewRounds?: number
}

export function getExecutableWorkflowNodes(workflow: WorkflowRecord): ExecutableWorkflowNode[] {
  return orderWorkflowNodes(workflow.nodes, workflow.edges).map((node, index) => {
    const config = getWorkflowNodeConfig(workflow, node)

    return {
      order: index + 1,
      nodeId: node.id,
      name: normalizeNodeName(config.name, node),
      skillId: normalizeSkillId(config.skillId),
    }
  })
}

export function getWorkflowRunReadiness(workflow: WorkflowRecord | null): WorkflowRunReadiness {
  if (!workflow) {
    return {
      canRun: false,
      nodes: [],
      missingSkillNodeNames: [],
      message: 'Select a workflow before running.',
    }
  }

  const nodes = getExecutableWorkflowNodes(workflow)

  if (nodes.length === 0) {
    return {
      canRun: false,
      nodes,
      missingSkillNodeNames: [],
      message: 'Create at least one workflow node before running.',
    }
  }

  const missingSkillNodeNames = nodes
    .filter((node) => !node.skillId)
    .map((node) => node.name)

  if (missingSkillNodeNames.length > 0) {
    return {
      canRun: false,
      nodes,
      missingSkillNodeNames,
      message: 'Configure skills for every workflow node before running.',
    }
  }

  return {
    canRun: true,
    nodes,
    missingSkillNodeNames: [],
    message: null,
  }
}

export function createWorkflowRunRequest({
  issue,
  workflow,
  now = new Date(),
  randomSuffix = createRandomSuffix(),
  maxReviewRounds = DEFAULT_MAX_REVIEW_ROUNDS,
}: CreateWorkflowRunRequestInput): WorkflowRunRequest {
  const readiness = getWorkflowRunReadiness(workflow)

  if (!readiness.canRun) {
    throw new Error(readiness.message ?? 'Workflow is not runnable.')
  }

  return {
    runId: createWorkflowRunId(issue, workflow, now, randomSuffix),
    createdAt: now.toISOString(),
    issue,
    workflow: {
      id: workflow.id,
      name: workflow.name,
      nodes: readiness.nodes,
      edges: workflow.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
      })),
    },
    options: {
      maxReviewRounds,
      freshSessionPerNode: true,
      skillInjection: 'snapshot-skill-directory',
    },
  }
}

function orderWorkflowNodes(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length <= 1 || edges.length === 0) {
    return nodes
  }

  const nodeIds = new Set(nodes.map((node) => node.id))
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const nodeIndexById = new Map(nodes.map((node, index) => [node.id, index]))
  const incomingCounts = new Map(nodes.map((node) => [node.id, 0]))
  const outgoingTargets = new Map<string, string[]>()

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      continue
    }

    incomingCounts.set(edge.target, (incomingCounts.get(edge.target) ?? 0) + 1)
    outgoingTargets.set(edge.source, [...(outgoingTargets.get(edge.source) ?? []), edge.target])
  }

  const orderedNodes: Node[] = []
  const visitedNodeIds = new Set<string>()
  const queue = nodes.filter((node) => (incomingCounts.get(node.id) ?? 0) === 0)

  while (queue.length > 0) {
    const node = queue.shift()

    if (!node || visitedNodeIds.has(node.id)) {
      continue
    }

    visitedNodeIds.add(node.id)
    orderedNodes.push(node)

    const targets = [...(outgoingTargets.get(node.id) ?? [])]
      .sort((firstTarget, secondTarget) => (
        (nodeIndexById.get(firstTarget) ?? 0) - (nodeIndexById.get(secondTarget) ?? 0)
      ))

    for (const target of targets) {
      const targetNode = nodeById.get(target)

      if (targetNode && !visitedNodeIds.has(target)) {
        queue.push(targetNode)
      }
    }
  }

  return [
    ...orderedNodes,
    ...nodes.filter((node) => !visitedNodeIds.has(node.id)),
  ]
}

function normalizeNodeName(name: string, node: Node) {
  const trimmedName = name.trim()

  if (trimmedName) {
    return trimmedName
  }

  const label = node.data?.label

  return typeof label === 'string' && label.trim() ? label.trim() : node.id
}

function normalizeSkillId(skillId: string | null) {
  const trimmedSkillId = skillId?.trim() ?? ''

  return trimmedSkillId ? trimmedSkillId : null
}

function createWorkflowRunId(
  issue: GithubIssue,
  workflow: WorkflowRecord,
  now: Date,
  randomSuffix: string,
) {
  const timestamp = [
    now.getUTCFullYear(),
    padDatePart(now.getUTCMonth() + 1),
    padDatePart(now.getUTCDate()),
    '-',
    padDatePart(now.getUTCHours()),
    padDatePart(now.getUTCMinutes()),
    padDatePart(now.getUTCSeconds()),
  ].join('')
  const workflowSlug = workflow.id.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()
  const suffix = randomSuffix.replace(/[^a-z0-9]+/gi, '').toLowerCase()

  return `${timestamp}-issue-${issue.number}-${workflowSlug}-${suffix}`
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0')
}

function createRandomSuffix() {
  return Math.random().toString(36).slice(2, 8) || 'run'
}

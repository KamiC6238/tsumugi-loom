import type { Edge, Node } from '@vue-flow/core'

export interface WorkflowRecord {
  id: string
  name: string
  accent: string
  nodes: Node[]
  edges: Edge[]
  nodeConfigs: Record<string, WorkflowNodeConfig>
}

export interface WorkflowState {
  workflows: WorkflowRecord[]
  activeWorkflowId: string | null
}

export interface WorkflowNodeConfig {
  name: string
  skillId: string | null
}

export interface WorkflowNodeUpdate {
  name: string
  skillId?: string | null
}

const WORKFLOW_ACCENTS = ['#d07a2c', '#3f6c62', '#8a5a52', '#7c7064']

export function createEmptyWorkflowState(): WorkflowState {
  return {
    workflows: [],
    activeWorkflowId: null,
  }
}

export function appendWorkflow(state: WorkflowState, rawName: string): WorkflowState {
  const name = rawName.trim()

  if (!name) {
    return state
  }

  const workflowNumber = state.workflows.length + 1
  const workflowId = `workflow-${workflowNumber}`
  const workflow = createWorkflowRecord(workflowId, name, workflowNumber)

  return {
    workflows: [...state.workflows, workflow],
    activeWorkflowId: workflow.id,
  }
}

export function selectWorkflow(state: WorkflowState, workflowId: string): WorkflowState {
  const workflowExists = state.workflows.some((workflow) => workflow.id === workflowId)

  if (!workflowExists || state.activeWorkflowId === workflowId) {
    return state
  }

  return {
    ...state,
    activeWorkflowId: workflowId,
  }
}

export function renameWorkflowNode(
  state: WorkflowState,
  workflowId: string,
  nodeId: string,
  rawLabel: string,
): WorkflowState {
  return updateWorkflowNode(state, workflowId, nodeId, { name: rawLabel })
}

export function updateWorkflowNode(
  state: WorkflowState,
  workflowId: string,
  nodeId: string,
  update: WorkflowNodeUpdate,
): WorkflowState {
  const label = update.name.trim()

  if (!label) {
    return state
  }

  const workflowIndex = state.workflows.findIndex((workflow) => workflow.id === workflowId)

  if (workflowIndex < 0) {
    return state
  }

  const workflow = state.workflows[workflowIndex]
  const nodeIndex = workflow.nodes.findIndex((node) => node.id === nodeId)

  if (nodeIndex < 0) {
    return state
  }

  const currentNode = workflow.nodes[nodeIndex]
  const currentConfig = getWorkflowNodeConfig(workflow, currentNode)
  const currentLabel = currentConfig.name
  const currentSkillId = currentConfig.skillId
  const nextSkillId = getNextSkillId(update.skillId, currentSkillId)
  const nextConfig: WorkflowNodeConfig = {
    name: label,
    skillId: nextSkillId,
  }

  if (currentLabel === label && currentSkillId === nextSkillId && currentNode.id in workflow.nodeConfigs) {
    return state
  }

  const nextNodes = [...workflow.nodes]

  nextNodes[nodeIndex] = applyNodeConfig(currentNode, nextConfig)

  const nextWorkflows = [...state.workflows]

  nextWorkflows[workflowIndex] = {
    ...workflow,
    nodeConfigs: {
      ...workflow.nodeConfigs,
      [currentNode.id]: nextConfig,
    },
    nodes: nextNodes,
  }

  return {
    ...state,
    workflows: nextWorkflows,
  }
}

export function getActiveWorkflow(state: WorkflowState): WorkflowRecord | null {
  return state.workflows.find((workflow) => workflow.id === state.activeWorkflowId) ?? null
}

export function getWorkflowNode(workflow: WorkflowRecord, nodeId: string): Node | null {
  const node = workflow.nodes.find((workflowNode) => workflowNode.id === nodeId)

  if (!node) {
    return null
  }

  return applyNodeConfig(node, getWorkflowNodeConfig(workflow, node))
}

export function getWorkflowNodeConfig(
  workflow: WorkflowRecord,
  node: Node,
): WorkflowNodeConfig {
  const storedConfig = workflow.nodeConfigs[node.id]

  if (storedConfig) {
    return storedConfig
  }

  return {
    name: String(node.data?.label ?? ''),
    skillId: getNodeSkillId(node),
  }
}

function applyNodeConfig(node: Node, config: WorkflowNodeConfig): Node {
  const nextData: Record<string, unknown> = {
    ...(isRecord(node.data) ? node.data : {}),
    label: config.name,
  }

  if (config.skillId) {
    nextData.skillId = config.skillId
  }
  else {
    delete nextData.skillId
  }

  return {
    ...node,
    data: nextData,
  }
}

function getNodeSkillId(node: Node): string | null {
  const skillId = node.data?.skillId

  return typeof skillId === 'string' && skillId.trim().length > 0 ? skillId : null
}

function getNextSkillId(
  nextSkillId: string | null | undefined,
  currentSkillId: string | null,
): string | null {
  if (nextSkillId === undefined) {
    return currentSkillId
  }

  const trimmedSkillId = nextSkillId?.trim() ?? ''

  return trimmedSkillId.length > 0 ? trimmedSkillId : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function createWorkflowRecord(
  workflowId: string,
  name: string,
  workflowNumber: number,
): WorkflowRecord {
  const accent = WORKFLOW_ACCENTS[(workflowNumber - 1) % WORKFLOW_ACCENTS.length]
  const laneOffset = (workflowNumber - 1) * 18
  const nodes: Node[] = [
    {
      id: `${workflowId}-start`,
      type: 'input',
      position: { x: 48, y: 64 + laneOffset },
      data: { label: `${name} brief` },
    },
    {
      id: `${workflowId}-review`,
      position: { x: 304, y: 178 + laneOffset },
      data: { label: `${name} review` },
    },
    {
      id: `${workflowId}-release`,
      type: 'output',
      position: { x: 566, y: 88 + laneOffset },
      data: { label: `${name} release` },
    },
  ]

  return {
    id: workflowId,
    name,
    accent,
    nodes,
    edges: [
      {
        id: `${workflowId}-start-review`,
        source: `${workflowId}-start`,
        target: `${workflowId}-review`,
        animated: true,
      },
      {
        id: `${workflowId}-review-release`,
        source: `${workflowId}-review`,
        target: `${workflowId}-release`,
      },
    ],
    nodeConfigs: createNodeConfigs(nodes),
  }
}

function createNodeConfigs(nodes: Node[]): Record<string, WorkflowNodeConfig> {
  return Object.fromEntries(nodes.map((node) => [
    node.id,
    {
      name: String(node.data?.label ?? ''),
      skillId: getNodeSkillId(node),
    },
  ]))
}
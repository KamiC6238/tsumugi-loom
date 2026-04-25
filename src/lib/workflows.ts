import type { Edge, Node } from '@vue-flow/core'

export interface WorkflowRecord {
  id: string
  name: string
  accent: string
  nodes: Node[]
  edges: Edge[]
}

export interface WorkflowState {
  workflows: WorkflowRecord[]
  activeWorkflowId: string | null
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
  const label = rawLabel.trim()

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
  const currentLabel = String(currentNode.data?.label ?? '')

  if (currentLabel === label) {
    return state
  }

  const nextNodes = [...workflow.nodes]

  nextNodes[nodeIndex] = {
    ...currentNode,
    data: {
      ...currentNode.data,
      label,
    },
  }

  const nextWorkflows = [...state.workflows]

  nextWorkflows[workflowIndex] = {
    ...workflow,
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

function createWorkflowRecord(
  workflowId: string,
  name: string,
  workflowNumber: number,
): WorkflowRecord {
  const accent = WORKFLOW_ACCENTS[(workflowNumber - 1) % WORKFLOW_ACCENTS.length]
  const laneOffset = (workflowNumber - 1) * 18

  return {
    id: workflowId,
    name,
    accent,
    nodes: [
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
    ],
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
  }
}
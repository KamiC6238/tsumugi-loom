import { defineStore } from 'pinia'
import { computed, shallowRef } from 'vue'

import {
  DEFAULT_WORKFLOW_RUNNER_ENDPOINT,
  createWorkflowRunRequest,
  getWorkflowRunReadiness,
} from '@/lib/workflowRuns'
import type { GithubIssue } from '@/lib/github'
import type { WorkflowRunRequest } from '@/lib/workflowRuns'
import type { WorkflowRecord } from '@/lib/workflows'

export type WorkflowRunsStatus = 'idle' | 'submitting' | 'submitted' | 'error'

export interface WorkflowRunSubmission {
  runId: string
  status: string
  artifactDir?: string
}

export type WorkflowRunSubmitter = (request: WorkflowRunRequest) => Promise<WorkflowRunSubmission>

export interface StartIssueWorkflowRunInput {
  issue: GithubIssue
  workflow: WorkflowRecord | null
  submitter?: WorkflowRunSubmitter
  now?: Date
  randomSuffix?: string
}

export function createWorkflowRunSubmitter(
  endpoint = DEFAULT_WORKFLOW_RUNNER_ENDPOINT,
): WorkflowRunSubmitter {
  return async (request) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })
    const payload = await readJsonResponse(response)

    if (!response.ok) {
      throw new Error(getErrorMessage(payload, `Local runner rejected the workflow run. (${response.status})`))
    }

    return normalizeWorkflowRunSubmission(payload, request.runId)
  }
}

export const useWorkflowRunsStore = defineStore('workflowRuns', () => {
  const status = shallowRef<WorkflowRunsStatus>('idle')
  const latestSubmission = shallowRef<WorkflowRunSubmission | null>(null)
  const latestRequest = shallowRef<WorkflowRunRequest | null>(null)
  const errorMessage = shallowRef<string | null>(null)

  const isSubmitting = computed(() => status.value === 'submitting')

  async function startIssueWorkflowRun({
    issue,
    workflow,
    submitter = createWorkflowRunSubmitter(),
    now,
    randomSuffix,
  }: StartIssueWorkflowRunInput) {
    const readiness = getWorkflowRunReadiness(workflow)

    if (!workflow || !readiness.canRun) {
      latestSubmission.value = null
      errorMessage.value = readiness.message ?? 'Workflow is not runnable.'
      status.value = 'error'

      return false
    }

    const request = createWorkflowRunRequest({ issue, workflow, now, randomSuffix })

    status.value = 'submitting'
    latestRequest.value = request
    latestSubmission.value = null
    errorMessage.value = null

    try {
      latestSubmission.value = await submitter(request)
      status.value = 'submitted'

      return true
    }
    catch (error) {
      latestSubmission.value = null
      errorMessage.value = error instanceof Error ? error.message : 'Workflow run could not be submitted.'
      status.value = 'error'

      return false
    }
  }

  function resetWorkflowRunStatus() {
    status.value = 'idle'
    latestSubmission.value = null
    latestRequest.value = null
    errorMessage.value = null
  }

  return {
    status,
    latestSubmission,
    latestRequest,
    errorMessage,
    isSubmitting,
    startIssueWorkflowRun,
    resetWorkflowRunStatus,
  }
})

async function readJsonResponse(response: Response) {
  try {
    return await response.json()
  }
  catch {
    return null
  }
}

function normalizeWorkflowRunSubmission(payload: unknown, fallbackRunId: string): WorkflowRunSubmission {
  if (!isRecord(payload)) {
    return {
      runId: fallbackRunId,
      status: 'queued',
    }
  }

  const runId = typeof payload.runId === 'string' && payload.runId.trim()
    ? payload.runId.trim()
    : fallbackRunId
  const status = typeof payload.status === 'string' && payload.status.trim()
    ? payload.status.trim()
    : 'queued'
  const artifactDir = typeof payload.artifactDir === 'string' && payload.artifactDir.trim()
    ? payload.artifactDir.trim()
    : undefined

  return {
    runId,
    status,
    ...(artifactDir ? { artifactDir } : {}),
  }
}

function getErrorMessage(payload: unknown, fallbackMessage: string) {
  if (isRecord(payload) && typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message.trim()
  }

  return fallbackMessage
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

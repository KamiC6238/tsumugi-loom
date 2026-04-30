import { defineStore } from 'pinia'
import { shallowRef } from 'vue'

import type { GithubIssue, GithubRepository } from '@/lib/github'
import {
  createKnowledgeBaseRunnerRepositoryEndpoint,
  createKnowledgeBaseRunnerRepositoryRequest,
  createKnowledgeBaseRunnerStatusEndpoint,
  createKnowledgeBaseUpdateEndpoint,
  createKnowledgeBaseUpdateRequest,
  getKnowledgeBaseErrorMessage,
  getKnowledgeBaseUpdateReadiness,
  normalizeKnowledgeBaseRunnerStatus,
  normalizeKnowledgeBaseUpdateResult,
} from '@/lib/knowledgeBase'
import type {
  KnowledgeBaseRunnerStatus,
  KnowledgeBaseUpdateRequest,
  KnowledgeBaseUpdateResult,
  KnowledgeBaseWorkflowRun,
} from '@/lib/knowledgeBase'

export type KnowledgeBaseUpdateStatus = 'idle' | 'updating' | 'updated' | 'error'

export interface KnowledgeBaseIssueRunState {
  status: KnowledgeBaseUpdateStatus
  result: KnowledgeBaseUpdateResult | null
  errorMessage: string | null
}

export type KnowledgeBaseUpdateSubmitter = (
  request: KnowledgeBaseUpdateRequest,
) => Promise<KnowledgeBaseUpdateResult>

export type KnowledgeBaseRunnerStatusFetcher = () => Promise<KnowledgeBaseRunnerStatus | null>
export interface KnowledgeBaseRunnerRepositorySyncOptions {
  signal?: AbortSignal
}
export type KnowledgeBaseRunnerRepositorySyncer = (
  repository: GithubRepository,
  options?: KnowledgeBaseRunnerRepositorySyncOptions,
) => Promise<KnowledgeBaseRunnerStatus | null>

export interface StartKnowledgeBaseUpdateInput {
  issue: GithubIssue
  repository: GithubRepository | null
  run: KnowledgeBaseWorkflowRun | null
  runnerStatus?: KnowledgeBaseRunnerStatus | null
  submitter?: KnowledgeBaseUpdateSubmitter
}

const idleIssueRunState: KnowledgeBaseIssueRunState = {
  status: 'idle',
  result: null,
  errorMessage: null,
}

export function createKnowledgeBaseUpdateSubmitter(): KnowledgeBaseUpdateSubmitter {
  return async (request) => {
    const response = await fetch(createKnowledgeBaseUpdateEndpoint(request.runId), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })
    const payload = await readJsonResponse(response)

    if (!response.ok) {
      throw new Error(getKnowledgeBaseErrorMessage(
        payload,
        `Local runner could not update the Knowledge Base. (${response.status})`,
      ))
    }

    return normalizeKnowledgeBaseUpdateResult(payload, request.runId)
  }
}

export function createKnowledgeBaseRunnerStatusFetcher(): KnowledgeBaseRunnerStatusFetcher {
  return async () => {
    const response = await fetch(createKnowledgeBaseRunnerStatusEndpoint())
    const payload = await readJsonResponse(response)

    if (!response.ok) {
      return null
    }

    return normalizeKnowledgeBaseRunnerStatus(payload)
  }
}

export function createKnowledgeBaseRunnerRepositorySyncer(): KnowledgeBaseRunnerRepositorySyncer {
  return async (repository, options) => {
    const response = await fetch(createKnowledgeBaseRunnerRepositoryEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createKnowledgeBaseRunnerRepositoryRequest(repository)),
      signal: options?.signal,
    })
    const payload = await readJsonResponse(response)

    if (!response.ok) {
      throw new Error(getKnowledgeBaseErrorMessage(
        payload,
        `Local runner could not select the repository. (${response.status})`,
      ))
    }

    return normalizeKnowledgeBaseRunnerStatus(payload)
  }
}

export const useKnowledgeBaseStore = defineStore('knowledgeBase', () => {
  const runnerStatus = shallowRef<KnowledgeBaseRunnerStatus | null>(null)
  const runnerStatusErrorMessage = shallowRef<string | null>(null)
  const issueRunStates = shallowRef<Record<string, KnowledgeBaseIssueRunState>>({})
  let runnerRepositorySyncRequestId = 0
  let runnerRepositorySyncController: AbortController | null = null

  async function refreshRunnerStatus(
    fetcher: KnowledgeBaseRunnerStatusFetcher = createKnowledgeBaseRunnerStatusFetcher(),
  ) {
    try {
      runnerStatus.value = await fetcher()
      runnerStatusErrorMessage.value = runnerStatus.value ? null : 'Local runner status is unavailable.'

      return runnerStatus.value !== null
    }
    catch (error) {
      runnerStatus.value = null
      runnerStatusErrorMessage.value = error instanceof Error
        ? error.message
        : 'Local runner status is unavailable.'

      return false
    }
  }

  async function syncRunnerRepository(
    repository: GithubRepository,
    syncer: KnowledgeBaseRunnerRepositorySyncer = createKnowledgeBaseRunnerRepositorySyncer(),
  ) {
    runnerRepositorySyncRequestId += 1
    const requestId = runnerRepositorySyncRequestId
    runnerRepositorySyncController?.abort()
    runnerRepositorySyncController = new AbortController()

    try {
      const nextRunnerStatus = await syncer(repository, {
        signal: runnerRepositorySyncController.signal,
      })

      if (requestId !== runnerRepositorySyncRequestId) {
        return false
      }

      runnerStatus.value = nextRunnerStatus
      runnerStatusErrorMessage.value = nextRunnerStatus ? null : 'Local runner status is unavailable.'

      return nextRunnerStatus !== null
    }
    catch (error) {
      if (requestId !== runnerRepositorySyncRequestId || isAbortError(error)) {
        return false
      }

      runnerStatus.value = null
      runnerStatusErrorMessage.value = error instanceof Error
        ? error.message
        : 'Local runner could not select the repository.'

      return false
    }
    finally {
      if (requestId === runnerRepositorySyncRequestId) {
        runnerRepositorySyncController = null
      }
    }
  }

  function resetRunnerStatus() {
    runnerRepositorySyncRequestId += 1
    runnerRepositorySyncController?.abort()
    runnerRepositorySyncController = null
    runnerStatus.value = null
    runnerStatusErrorMessage.value = null
  }

  function resetIssueRunStates() {
    issueRunStates.value = {}
  }

  function getIssueRunState(issueNumber: number, runId: string | null | undefined): KnowledgeBaseIssueRunState {
    if (!runId) {
      return idleIssueRunState
    }

    return issueRunStates.value[getIssueRunKey(issueNumber, runId)] ?? idleIssueRunState
  }

  async function startKnowledgeBaseUpdate({
    issue,
    repository,
    run,
    runnerStatus: inputRunnerStatus = runnerStatus.value,
    submitter = createKnowledgeBaseUpdateSubmitter(),
  }: StartKnowledgeBaseUpdateInput) {
    const runId = run?.runId ?? 'no-run'
    const key = getIssueRunKey(issue.number, runId)
    const currentState = issueRunStates.value[key]

    if (currentState?.status === 'updating') {
      return false
    }

    const readiness = getKnowledgeBaseUpdateReadiness({
      repository,
      runnerStatus: inputRunnerStatus,
      run,
    })

    if (!repository || !run || !readiness.canUpdate) {
      setIssueRunState(key, {
        status: 'error',
        result: null,
        errorMessage: readiness.message ?? 'Knowledge Base update is not available.',
      })

      return false
    }

    const request = createKnowledgeBaseUpdateRequest({ issue, repository, run })

    setIssueRunState(key, {
      status: 'updating',
      result: null,
      errorMessage: null,
    })

    try {
      const result = await submitter(request)

      setIssueRunState(key, {
        status: 'updated',
        result,
        errorMessage: null,
      })

      return true
    }
    catch (error) {
      setIssueRunState(key, {
        status: 'error',
        result: null,
        errorMessage: error instanceof Error ? error.message : 'Knowledge Base update failed.',
      })

      return false
    }
  }

  function setIssueRunState(key: string, state: KnowledgeBaseIssueRunState) {
    issueRunStates.value = {
      ...issueRunStates.value,
      [key]: state,
    }
  }

  return {
    runnerStatus,
    runnerStatusErrorMessage,
    issueRunStates,
    refreshRunnerStatus,
    syncRunnerRepository,
    resetRunnerStatus,
    resetIssueRunStates,
    getIssueRunState,
    startKnowledgeBaseUpdate,
  }
})

function getIssueRunKey(issueNumber: number, runId: string) {
  return `${issueNumber}:${runId}`
}

function isAbortError(error: unknown) {
  return typeof error === 'object'
    && error !== null
    && 'name' in error
    && error.name === 'AbortError'
}

async function readJsonResponse(response: Response) {
  try {
    return await response.json()
  }
  catch {
    return null
  }
}
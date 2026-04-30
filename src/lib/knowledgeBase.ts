import type { GithubIssue, GithubRepository } from '@/lib/github'
import { DEFAULT_WORKFLOW_RUNNER_ENDPOINT } from '@/lib/workflowRuns'

export const DEFAULT_KNOWLEDGE_BASE_TARGET_PATH = 'docs/knowledge-base.md'

export interface KnowledgeBaseRunnerStatus {
  serviceRoot: string | null
  repoPath: string | null
  skillCatalogPath: string | null
  repositoryFullName: string | null
  selectedRepository: Pick<GithubRepository, 'owner' | 'name' | 'fullName' | 'remoteUrl' | 'localName'> | null
  repositorySearchRoots: string[]
  mode: string
  capabilities: {
    knowledgeBaseUpdates: boolean
    repositorySelection: boolean
  }
}

export interface KnowledgeBaseWorkflowRun {
  runId: string
  status: string
  artifactDir?: string
}

export interface KnowledgeBaseUpdateReadiness {
  canUpdate: boolean
  message: string | null
}

export interface KnowledgeBaseUpdateRequest {
  runId: string
  issue: Pick<GithubIssue, 'id' | 'number' | 'title' | 'url'>
  repository: Pick<GithubRepository, 'owner' | 'name' | 'fullName'>
  target: {
    path: typeof DEFAULT_KNOWLEDGE_BASE_TARGET_PATH
  }
}

export interface KnowledgeBaseRunnerRepositoryRequest {
  repository: Pick<GithubRepository, 'owner' | 'name' | 'fullName' | 'remoteUrl' | 'localName'>
}

export interface KnowledgeBaseUpdateResult {
  runId: string
  status: 'updated'
  targetPath: string
  factCount: number
  sourceArtifacts: string[]
  updateArtifact: string | null
}

export interface GetKnowledgeBaseUpdateReadinessInput {
  repository: GithubRepository | null
  runnerStatus: KnowledgeBaseRunnerStatus | null
  run: KnowledgeBaseWorkflowRun | null
}

export interface CreateKnowledgeBaseUpdateRequestInput {
  issue: GithubIssue
  repository: GithubRepository
  run: KnowledgeBaseWorkflowRun
}

export function getKnowledgeBaseUpdateReadiness({
  repository,
  runnerStatus,
  run,
}: GetKnowledgeBaseUpdateReadinessInput): KnowledgeBaseUpdateReadiness {
  if (!repository) {
    return {
      canUpdate: false,
      message: 'Select a repository before updating the Knowledge base.',
    }
  }

  if (!run) {
    return {
      canUpdate: false,
      message: 'Run the issue workflow before updating the Knowledge base.',
    }
  }

  if (run.status !== 'completed') {
    return {
      canUpdate: false,
      message: 'Wait for the workflow run to complete before updating the Knowledge base.',
    }
  }

  if (!runnerStatus) {
    return {
      canUpdate: false,
      message: 'Local runner status is unavailable.',
    }
  }

  if (!runnerStatus.capabilities.knowledgeBaseUpdates) {
    return {
      canUpdate: false,
      message: 'Local runner does not support Knowledge Base updates.',
    }
  }

  if (!runnerStatus.repositoryFullName) {
    return {
      canUpdate: false,
      message: 'Local runner repository was not recognized.',
    }
  }

  if (!isSameRepositoryFullName(runnerStatus.repositoryFullName, repository.fullName)) {
    return {
      canUpdate: false,
      message: 'Local runner repository does not match the selected repository.',
    }
  }

  return {
    canUpdate: true,
    message: null,
  }
}

export function createKnowledgeBaseUpdateRequest({
  issue,
  repository,
  run,
}: CreateKnowledgeBaseUpdateRequestInput): KnowledgeBaseUpdateRequest {
  return {
    runId: run.runId,
    issue: {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      url: issue.url,
    },
    repository: {
      owner: repository.owner,
      name: repository.name,
      fullName: repository.fullName,
    },
    target: {
      path: DEFAULT_KNOWLEDGE_BASE_TARGET_PATH,
    },
  }
}

export function createKnowledgeBaseRunnerRepositoryRequest(
  repository: GithubRepository,
): KnowledgeBaseRunnerRepositoryRequest {
  return {
    repository: {
      owner: repository.owner,
      name: repository.name,
      fullName: repository.fullName,
      remoteUrl: repository.remoteUrl,
      localName: repository.localName,
    },
  }
}

export function createKnowledgeBaseUpdateEndpoint(
  runId: string,
  runnerEndpoint = DEFAULT_WORKFLOW_RUNNER_ENDPOINT,
) {
  return `${runnerEndpoint.replace(/\/+$/, '')}/${encodeURIComponent(runId)}/knowledge-base`
}

export function createKnowledgeBaseRunnerStatusEndpoint(
  runnerEndpoint = DEFAULT_WORKFLOW_RUNNER_ENDPOINT,
) {
  return `${runnerEndpoint.replace(/\/runs\/?$/, '')}/status`
}

export function createKnowledgeBaseRunnerRepositoryEndpoint(
  runnerEndpoint = DEFAULT_WORKFLOW_RUNNER_ENDPOINT,
) {
  return `${runnerEndpoint.replace(/\/runs\/?$/, '')}/repository`
}

export function normalizeKnowledgeBaseRunnerStatus(payload: unknown): KnowledgeBaseRunnerStatus | null {
  if (!isRecord(payload)) {
    return null
  }

  return {
    serviceRoot: typeof payload.serviceRoot === 'string' && payload.serviceRoot.trim()
      ? payload.serviceRoot.trim()
      : null,
    repoPath: typeof payload.repoPath === 'string' && payload.repoPath.trim()
      ? payload.repoPath.trim()
      : null,
    skillCatalogPath: typeof payload.skillCatalogPath === 'string' && payload.skillCatalogPath.trim()
      ? payload.skillCatalogPath.trim()
      : null,
    repositoryFullName: typeof payload.repositoryFullName === 'string' && payload.repositoryFullName.trim()
      ? payload.repositoryFullName.trim()
      : null,
    selectedRepository: normalizeRunnerSelectedRepository(payload.selectedRepository),
    repositorySearchRoots: Array.isArray(payload.repositorySearchRoots)
      ? payload.repositorySearchRoots.filter((root): root is string => typeof root === 'string' && Boolean(root.trim()))
      : [],
    mode: typeof payload.mode === 'string' && payload.mode.trim()
      ? payload.mode.trim()
      : 'unknown',
    capabilities: {
      knowledgeBaseUpdates: isRecord(payload.capabilities)
        && payload.capabilities.knowledgeBaseUpdates === true,
      repositorySelection: isRecord(payload.capabilities)
        && payload.capabilities.repositorySelection === true,
    },
  }
}

function normalizeRunnerSelectedRepository(
  value: unknown,
): KnowledgeBaseRunnerStatus['selectedRepository'] {
  if (!isRecord(value)) {
    return null
  }

  const owner = getString(value.owner)
  const name = getString(value.name)
  const fullName = getString(value.fullName)

  if (!owner || !name || !fullName) {
    return null
  }

  return {
    owner,
    name,
    fullName,
    remoteUrl: getString(value.remoteUrl) ?? '',
    localName: getString(value.localName) ?? name,
  }
}

export function normalizeKnowledgeBaseUpdateResult(
  payload: unknown,
  fallbackRunId: string,
): KnowledgeBaseUpdateResult {
  if (!isRecord(payload)) {
    return {
      runId: fallbackRunId,
      status: 'updated',
      targetPath: DEFAULT_KNOWLEDGE_BASE_TARGET_PATH,
      factCount: 0,
      sourceArtifacts: [],
      updateArtifact: null,
    }
  }

  return {
    runId: getString(payload.runId) ?? fallbackRunId,
    status: 'updated',
    targetPath: getString(payload.targetPath) ?? DEFAULT_KNOWLEDGE_BASE_TARGET_PATH,
    factCount: typeof payload.factCount === 'number' && Number.isFinite(payload.factCount)
      ? payload.factCount
      : 0,
    sourceArtifacts: Array.isArray(payload.sourceArtifacts)
      ? payload.sourceArtifacts.filter((source): source is string => typeof source === 'string')
      : [],
    updateArtifact: getString(payload.updateArtifact),
  }
}

export function getKnowledgeBaseErrorMessage(payload: unknown, fallbackMessage: string) {
  if (isRecord(payload) && typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message.trim()
  }

  return fallbackMessage
}

function isSameRepositoryFullName(first: string, second: string) {
  return first.trim().toLowerCase() === second.trim().toLowerCase()
}

function getString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
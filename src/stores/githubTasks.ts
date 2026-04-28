import { defineStore } from 'pinia'
import { computed, shallowRef } from 'vue'

import {
  GithubApiError,
  clearGithubAuthToken,
  clearSelectedGithubRepository,
  fetchGithubIssues,
  loadGithubAuthToken,
  loadSelectedGithubRepository,
  saveGithubAuthToken,
  saveSelectedGithubRepository,
} from '@/lib/github'
import type { GithubFetch, GithubIssue, GithubRepository } from '@/lib/github'

export type GithubTasksStatus = 'idle' | 'loading' | 'ready' | 'error'
export type GithubTasksErrorKind = 'auth' | 'request' | 'repository'

export const useGithubTasksStore = defineStore('githubTasks', () => {
  const selectedRepository = shallowRef<GithubRepository | null>(loadSelectedGithubRepository())
  const authToken = shallowRef<string | null>(loadGithubAuthToken())
  const issues = shallowRef<GithubIssue[]>([])
  const status = shallowRef<GithubTasksStatus>('idle')
  const errorMessage = shallowRef<string | null>(null)
  const errorKind = shallowRef<GithubTasksErrorKind | null>(null)
  let latestIssueRequestId = 0

  const hasSelectedRepository = computed(() => selectedRepository.value !== null)
  const hasAuthToken = computed(() => Boolean(authToken.value))
  const isAuthRequired = computed(() => errorKind.value === 'auth')
  const isAuthPromptVisible = computed(() => isAuthRequired.value || errorKind.value === 'auth')
  const isLoading = computed(() => status.value === 'loading')
  const isIssueListEmpty = computed(() => status.value === 'ready' && issues.value.length === 0)
  const issueCount = computed(() => issues.value.length)

  function selectRepository(repository: GithubRepository) {
    invalidateIssueRequests()
    selectedRepository.value = repository
    issues.value = []
    status.value = 'idle'
    errorMessage.value = null
    errorKind.value = null
    saveSelectedGithubRepository(repository)
  }

  function clearRepository() {
    invalidateIssueRequests()
    selectedRepository.value = null
    issues.value = []
    status.value = 'idle'
    errorMessage.value = null
    errorKind.value = null
    clearSelectedGithubRepository()
  }

  function setRepositoryError(message: string) {
    status.value = 'error'
    errorMessage.value = message
    errorKind.value = 'repository'
  }

  function clearError() {
    if (status.value === 'error') {
      status.value = 'idle'
    }

    errorMessage.value = null
    errorKind.value = null
  }

  function setAuthToken(nextAuthToken: string) {
    const normalizedAuthToken = nextAuthToken.trim()

    if (!normalizedAuthToken) {
      return false
    }

    invalidateIssueRequests()
    authToken.value = normalizedAuthToken
    errorMessage.value = null
    errorKind.value = null
    saveGithubAuthToken(normalizedAuthToken)

    return true
  }

  function clearAuthToken() {
    invalidateIssueRequests()
    authToken.value = null
    issues.value = []
    status.value = 'idle'
    errorMessage.value = null
    errorKind.value = null
    clearGithubAuthToken()
  }

  async function refreshIssues(fetcher?: GithubFetch) {
    const requestRepository = selectedRepository.value
    const requestAuthToken = authToken.value

    if (!requestRepository) {
      return false
    }

    const requestId = createIssueRequestId()

    status.value = 'loading'
    errorMessage.value = null
    errorKind.value = null

    try {
      const nextIssues = await fetchGithubIssues(requestRepository, requestAuthToken, fetcher)

      if (!isCurrentIssueRequest(requestId, requestRepository, requestAuthToken)) {
        return false
      }

      issues.value = nextIssues
      status.value = 'ready'

      return true
    }
    catch (error) {
      if (!isCurrentIssueRequest(requestId, requestRepository, requestAuthToken)) {
        return false
      }

      issues.value = []
      status.value = 'error'

      if (error instanceof GithubApiError) {
        errorMessage.value = error.message
        errorKind.value = error.kind
      }
      else {
        errorMessage.value = 'GitHub issues could not be loaded.'
        errorKind.value = 'request'
      }

      return false
    }
  }

  function createIssueRequestId() {
    latestIssueRequestId += 1

    return latestIssueRequestId
  }

  function invalidateIssueRequests() {
    latestIssueRequestId += 1
  }

  function isCurrentIssueRequest(
    requestId: number,
    requestRepository: GithubRepository,
    requestAuthToken: string | null,
  ) {
    return latestIssueRequestId === requestId
      && selectedRepository.value?.fullName === requestRepository.fullName
      && authToken.value === requestAuthToken
  }

  return {
    selectedRepository,
    authToken,
    issues,
    status,
    errorMessage,
    errorKind,
    hasSelectedRepository,
    hasAuthToken,
    isAuthRequired,
    isAuthPromptVisible,
    isLoading,
    isIssueListEmpty,
    issueCount,
    selectRepository,
    clearRepository,
    setRepositoryError,
    clearError,
    setAuthToken,
    clearAuthToken,
    refreshIssues,
  }
})
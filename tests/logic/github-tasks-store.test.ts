import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { GITHUB_AUTH_TOKEN_STORAGE_KEY } from '../../src/lib/github'
import type { GithubFetch, GithubRepository, GithubStorageLike } from '../../src/lib/github'
import { useGithubTasksStore } from '../../src/stores/githubTasks'

function createMemoryStorage(): GithubStorageLike {
  const items = new Map<string, string>()

  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
    removeItem: (key) => items.delete(key),
  }
}

function createFetchResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status })
}

function createDeferredResponse() {
  let resolveResponse: (response: Response) => void = () => undefined
  const promise = new Promise<Response>((resolve) => {
    resolveResponse = resolve
  })

  return { promise, resolveResponse }
}

const repository: GithubRepository = {
  owner: 'octo-org',
  name: 'hello-world',
  fullName: 'octo-org/hello-world',
  remoteUrl: 'https://github.com/octo-org/hello-world.git',
  localName: 'hello-world',
}

const nextRepository: GithubRepository = {
  owner: 'octo-org',
  name: 'next-repo',
  fullName: 'octo-org/next-repo',
  remoteUrl: 'https://github.com/octo-org/next-repo.git',
  localName: 'next-repo',
}

describe('github tasks store', () => {
  let storage: GithubStorageLike

  beforeEach(() => {
    storage = createMemoryStorage()
    vi.stubGlobal('localStorage', storage)
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not require authentication immediately after a repository is selected without a token', () => {
    const store = useGithubTasksStore()

    store.selectRepository(repository)

    expect(store.selectedRepository).toEqual(repository)
    expect(store.isAuthRequired).toBe(false)
    expect(store.isAuthPromptVisible).toBe(false)
    expect(store.status).toBe('idle')
  })

  it('fetches public repository issues without a token', async () => {
    const store = useGithubTasksStore()
    const fetcher = vi.fn(async () => createFetchResponse([
      {
        id: 41,
        number: 12,
        title: 'Public issue',
        state: 'open',
        html_url: 'https://github.com/octo-org/hello-world/issues/12',
        user: { login: 'mona' },
        labels: [],
        comments: 0,
        created_at: '2026-04-27T00:00:00Z',
        updated_at: '2026-04-28T00:00:00Z',
      },
    ])) as GithubFetch

    store.selectRepository(repository)

    await store.refreshIssues(fetcher)

    expect(fetcher).toHaveBeenCalledWith(
      'https://api.github.com/repos/octo-org/hello-world/issues?state=open&per_page=50',
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: expect.any(String),
        }),
      }),
    )
    expect(store.status).toBe('ready')
    expect(store.issues.map((issue) => issue.title)).toEqual(['Public issue'])
  })

  it('persists a token and fetches normalized issues', async () => {
    const store = useGithubTasksStore()
    const fetcher = vi.fn(async () => createFetchResponse([
      {
        id: 21,
        number: 4,
        title: 'Load issue cards',
        state: 'open',
        html_url: 'https://github.com/octo-org/hello-world/issues/4',
        user: { login: 'mona' },
        labels: [{ name: 'feature' }],
        comments: 1,
        created_at: '2026-04-27T00:00:00Z',
        updated_at: '2026-04-28T00:00:00Z',
      },
    ])) as GithubFetch

    store.selectRepository(repository)
    expect(store.setAuthToken(' github_pat_test ')).toBe(true)

    await store.refreshIssues(fetcher)

    expect(storage.getItem(GITHUB_AUTH_TOKEN_STORAGE_KEY)).toBe('github_pat_test')
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.github.com/repos/octo-org/hello-world/issues?state=open&per_page=50',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer github_pat_test',
        }),
      }),
    )
    expect(store.status).toBe('ready')
    expect(store.issueCount).toBe(1)
    expect(store.issues[0]?.title).toBe('Load issue cards')
  })

  it('restores the selected repository and auth token in a new store instance', () => {
    const store = useGithubTasksStore()

    store.selectRepository(repository)
    store.setAuthToken('github_pat_test')

    setActivePinia(createPinia())
    const restoredStore = useGithubTasksStore()

    expect(restoredStore.selectedRepository).toEqual(repository)
    expect(restoredStore.authToken).toBe('github_pat_test')
    expect(restoredStore.hasAuthToken).toBe(true)
    expect(restoredStore.isAuthRequired).toBe(false)
  })

  it('marks an authenticated empty issue response as empty', async () => {
    const store = useGithubTasksStore()
    const fetcher = vi.fn(async () => createFetchResponse([])) as GithubFetch

    store.selectRepository(repository)
    store.setAuthToken('github_pat_test')

    await store.refreshIssues(fetcher)

    expect(store.status).toBe('ready')
    expect(store.isIssueListEmpty).toBe(true)
  })

  it('ignores stale issue responses after the selected repository changes', async () => {
    const store = useGithubTasksStore()
    const firstResponse = createDeferredResponse()
    const secondResponse = createDeferredResponse()
    const fetcher = vi.fn()
      .mockReturnValueOnce(firstResponse.promise)
      .mockReturnValueOnce(secondResponse.promise) as unknown as GithubFetch

    store.selectRepository(repository)
    store.setAuthToken('github_pat_test')
    const firstRefresh = store.refreshIssues(fetcher)

    store.selectRepository(nextRepository)
    const secondRefresh = store.refreshIssues(fetcher)

    secondResponse.resolveResponse(createFetchResponse([
      {
        id: 31,
        number: 10,
        title: 'Next repository issue',
        state: 'open',
        html_url: 'https://github.com/octo-org/next-repo/issues/10',
        user: { login: 'mona' },
        labels: [],
        comments: 0,
        created_at: '2026-04-27T00:00:00Z',
        updated_at: '2026-04-28T00:00:00Z',
      },
    ]))
    await secondRefresh

    firstResponse.resolveResponse(createFetchResponse([
      {
        id: 21,
        number: 4,
        title: 'Old repository issue',
        state: 'open',
        html_url: 'https://github.com/octo-org/hello-world/issues/4',
        user: { login: 'mona' },
        labels: [],
        comments: 0,
        created_at: '2026-04-27T00:00:00Z',
        updated_at: '2026-04-28T00:00:00Z',
      },
    ]))
    await firstRefresh

    expect(store.selectedRepository).toEqual(nextRepository)
    expect(store.status).toBe('ready')
    expect(store.issues.map((issue) => issue.title)).toEqual(['Next repository issue'])
  })

  it.each([401, 403, 404])('shows the auth prompt when GitHub rejects the token with %i', async (statusCode) => {
    const store = useGithubTasksStore()
    const fetcher = vi.fn(async () => (
      createFetchResponse({ message: 'Bad credentials' }, statusCode)
    )) as GithubFetch

    store.selectRepository(repository)
    store.setAuthToken('github_pat_bad')

    await store.refreshIssues(fetcher)

    expect(store.status).toBe('error')
    expect(store.errorKind).toBe('auth')
    expect(store.isAuthPromptVisible).toBe(true)
    expect(store.issues).toEqual([])

    if (statusCode === 404) {
      expect(store.errorMessage).toContain('not found')
    }
  })
})
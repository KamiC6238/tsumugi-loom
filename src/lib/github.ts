export interface GithubRepository {
  owner: string
  name: string
  fullName: string
  remoteUrl: string
  localName: string
}

export interface GithubIssue {
  id: number
  number: number
  title: string
  state: 'open' | 'closed'
  url: string
  author: string
  labels: string[]
  comments: number
  createdAt: string
  updatedAt: string
}

export type GithubApiErrorKind = 'auth' | 'request'

export class GithubApiError extends Error {
  readonly kind: GithubApiErrorKind

  constructor(message: string, kind: GithubApiErrorKind) {
    super(message)
    this.name = 'GithubApiError'
    this.kind = kind
  }
}

export type GithubFetch = typeof fetch

export interface GithubStorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export const GITHUB_AUTH_TOKEN_STORAGE_KEY = 'tsumugi-loom.github.authToken'
export const GITHUB_SELECTED_REPOSITORY_STORAGE_KEY = 'tsumugi-loom.github.selectedRepository'

interface GithubRemoteCandidate {
  owner: string
  name: string
  remoteUrl: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeRepositoryName(name: string) {
  return name.trim().replace(/\.git$/i, '')
}

function toRepository(candidate: GithubRemoteCandidate, localName: string): GithubRepository {
  return {
    owner: candidate.owner,
    name: candidate.name,
    fullName: `${candidate.owner}/${candidate.name}`,
    remoteUrl: candidate.remoteUrl,
    localName,
  }
}

export function parseGithubRepositoryFromRemote(remoteUrl: string): GithubRemoteCandidate | null {
  const normalizedRemoteUrl = remoteUrl.trim()

  if (!normalizedRemoteUrl) {
    return null
  }

  try {
    const remote = new URL(normalizedRemoteUrl)

    if (remote.hostname.toLowerCase() !== 'github.com') {
      return null
    }

    const [owner, rawName] = remote.pathname.replace(/^\//, '').split('/')
    const name = rawName ? normalizeRepositoryName(rawName) : ''

    if (!owner || !name) {
      return null
    }

    return { owner, name, remoteUrl: normalizedRemoteUrl }
  }
  catch {
    const sshMatch = normalizedRemoteUrl.match(
      /^(?:ssh:\/\/)?(?:git@)?github\.com(?::|\/)([^\s/]+)\/([^\s/]+)$/i,
    )

    if (!sshMatch) {
      return null
    }

    const [, owner, rawName] = sshMatch
    const name = normalizeRepositoryName(rawName)

    if (!owner || !name) {
      return null
    }

    return { owner, name, remoteUrl: normalizedRemoteUrl }
  }
}

export function parseGithubRepositoryFromGitConfig(
  gitConfig: string,
  localName = 'Repository',
): GithubRepository | null {
  const remotes: Array<{ name: string; url: string }> = []
  let currentRemoteName: string | null = null

  for (const line of gitConfig.split(/\r?\n/)) {
    const sectionMatch = line.match(/^\s*\[(.+)]\s*$/)

    if (sectionMatch) {
      const remoteSectionMatch = sectionMatch[1].match(/^remote\s+"(.+)"$/)
      currentRemoteName = remoteSectionMatch?.[1] ?? null
      continue
    }

    const urlMatch = line.match(/^\s*url\s*=\s*(.+?)\s*$/)

    if (currentRemoteName && urlMatch) {
      remotes.push({ name: currentRemoteName, url: urlMatch[1] })
    }
  }

  const originRemote = remotes.find((remote) => remote.name === 'origin')
  const orderedRemotes = originRemote
    ? [originRemote, ...remotes.filter((remote) => remote !== originRemote)]
    : remotes

  for (const remote of orderedRemotes) {
    const repository = parseGithubRepositoryFromRemote(remote.url)

    if (repository) {
      return toRepository(repository, localName)
    }
  }

  return null
}

export function normalizeGithubIssues(payload: unknown): GithubIssue[] {
  if (!Array.isArray(payload)) {
    return []
  }

  return payload.flatMap((item) => {
    if (!isRecord(item) || 'pull_request' in item) {
      return []
    }

    const id = typeof item.id === 'number' ? item.id : null
    const number = typeof item.number === 'number' ? item.number : null
    const title = typeof item.title === 'string' ? item.title : null
    const state = item.state === 'closed' ? 'closed' : 'open'
    const url = typeof item.html_url === 'string' ? item.html_url : null
    const createdAt = typeof item.created_at === 'string' ? item.created_at : ''
    const updatedAt = typeof item.updated_at === 'string' ? item.updated_at : ''

    if (id === null || number === null || !title || !url) {
      return []
    }

    const labels = Array.isArray(item.labels)
      ? item.labels.flatMap((label) => {
          if (typeof label === 'string') {
            return [label]
          }

          if (isRecord(label) && typeof label.name === 'string') {
            return [label.name]
          }

          return []
        })
      : []
    const author = isRecord(item.user) && typeof item.user.login === 'string'
      ? item.user.login
      : 'ghost'
    const comments = typeof item.comments === 'number' ? item.comments : 0

    return [
      {
        id,
        number,
        title,
        state,
        url,
        author,
        labels,
        comments,
        createdAt,
        updatedAt,
      },
    ]
  })
}

export async function fetchGithubIssues(
  repository: GithubRepository,
  authToken: string | null,
  fetcher: GithubFetch = fetch,
): Promise<GithubIssue[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }

  const response = await fetcher(
    `https://api.github.com/repos/${repository.owner}/${repository.name}/issues?state=open&per_page=50`,
    { headers },
  )

  if (!response.ok) {
    const kind: GithubApiErrorKind = response.status === 401
      || response.status === 403
      || response.status === 404
      ? 'auth'
      : 'request'
    const message = response.status === 404
      ? 'GitHub repository was not found, or your token does not have access to it.'
      : kind === 'auth'
        ? 'GitHub authentication failed. Check your token and repository access.'
      : `GitHub issues could not be loaded. (${response.status})`

    throw new GithubApiError(message, kind)
  }

  return normalizeGithubIssues(await response.json())
}

export function loadGithubAuthToken(storage = getBrowserStorage()): string | null {
  return storage?.getItem(GITHUB_AUTH_TOKEN_STORAGE_KEY) ?? null
}

export function saveGithubAuthToken(authToken: string, storage = getBrowserStorage()) {
  storage?.setItem(GITHUB_AUTH_TOKEN_STORAGE_KEY, authToken)
}

export function clearGithubAuthToken(storage = getBrowserStorage()) {
  storage?.removeItem(GITHUB_AUTH_TOKEN_STORAGE_KEY)
}

export function loadSelectedGithubRepository(storage = getBrowserStorage()): GithubRepository | null {
  const rawRepository = storage?.getItem(GITHUB_SELECTED_REPOSITORY_STORAGE_KEY)

  if (!rawRepository) {
    return null
  }

  try {
    const repository = JSON.parse(rawRepository) as Partial<GithubRepository>

    if (
      typeof repository.owner !== 'string'
      || typeof repository.name !== 'string'
      || typeof repository.fullName !== 'string'
      || typeof repository.remoteUrl !== 'string'
      || typeof repository.localName !== 'string'
    ) {
      return null
    }

    return repository as GithubRepository
  }
  catch {
    return null
  }
}

export function saveSelectedGithubRepository(
  repository: GithubRepository,
  storage = getBrowserStorage(),
) {
  storage?.setItem(GITHUB_SELECTED_REPOSITORY_STORAGE_KEY, JSON.stringify(repository))
}

export function clearSelectedGithubRepository(storage = getBrowserStorage()) {
  storage?.removeItem(GITHUB_SELECTED_REPOSITORY_STORAGE_KEY)
}

function getBrowserStorage(): GithubStorageLike | null {
  if (typeof globalThis.localStorage === 'undefined') {
    return null
  }

  return globalThis.localStorage
}
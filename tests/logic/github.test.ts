import { describe, expect, it } from 'vitest'

import {
  GITHUB_AUTH_TOKEN_STORAGE_KEY,
  GITHUB_SELECTED_REPOSITORY_STORAGE_KEY,
  clearGithubAuthToken,
  clearSelectedGithubRepository,
  loadGithubAuthToken,
  loadSelectedGithubRepository,
  normalizeGithubIssues,
  parseGithubRepositoryFromGitConfig,
  parseGithubRepositoryFromRemote,
  saveGithubAuthToken,
  saveSelectedGithubRepository,
} from '../../src/lib/github'
import type { GithubRepository, GithubStorageLike } from '../../src/lib/github'

function createMemoryStorage(): GithubStorageLike {
  const items = new Map<string, string>()

  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
    removeItem: (key) => items.delete(key),
  }
}

const repository: GithubRepository = {
  owner: 'octo-org',
  name: 'hello-world',
  fullName: 'octo-org/hello-world',
  remoteUrl: 'https://github.com/octo-org/hello-world.git',
  localName: 'hello-world',
}

describe('github helpers', () => {
  it('parses GitHub repositories from https and ssh remotes', () => {
    expect(parseGithubRepositoryFromRemote('https://github.com/octo-org/hello-world.git')).toEqual({
      owner: 'octo-org',
      name: 'hello-world',
      remoteUrl: 'https://github.com/octo-org/hello-world.git',
    })
    expect(parseGithubRepositoryFromRemote('git@github.com:octo-org/hello-world.git')).toEqual({
      owner: 'octo-org',
      name: 'hello-world',
      remoteUrl: 'git@github.com:octo-org/hello-world.git',
    })
    expect(parseGithubRepositoryFromRemote('ssh://git@github.com/octo-org/hello-world.git')).toEqual({
      owner: 'octo-org',
      name: 'hello-world',
      remoteUrl: 'ssh://git@github.com/octo-org/hello-world.git',
    })
    expect(parseGithubRepositoryFromRemote('https://gitlab.com/octo-org/hello-world.git')).toBeNull()
  })

  it('prefers the origin GitHub remote from git config', () => {
    const gitConfig = `
[remote "backup"]
  url = git@github.com:octo-org/backup.git
[remote "origin"]
  url = https://github.com/octo-org/hello-world.git
`

    expect(parseGithubRepositoryFromGitConfig(gitConfig, 'local-repo')).toEqual({
      owner: 'octo-org',
      name: 'hello-world',
      fullName: 'octo-org/hello-world',
      remoteUrl: 'https://github.com/octo-org/hello-world.git',
      localName: 'local-repo',
    })
  })

  it('ignores urls outside remote sections in git config', () => {
    const gitConfig = `
[remote "origin"]
  url = https://gitlab.com/octo-org/not-github.git
[submodule "vendor/theme"]
  url = https://github.com/octo-org/theme.git
`

    expect(parseGithubRepositoryFromGitConfig(gitConfig, 'local-repo')).toBeNull()
  })

  it('normalizes GitHub issues and excludes pull requests', () => {
    const issues = normalizeGithubIssues([
      {
        id: 11,
        number: 7,
        title: 'Fix sidebar flow',
        state: 'open',
        html_url: 'https://github.com/octo-org/hello-world/issues/7',
        user: { login: 'mona' },
        labels: [{ name: 'bug' }, 'ui'],
        comments: 3,
        created_at: '2026-04-27T00:00:00Z',
        updated_at: '2026-04-28T00:00:00Z',
      },
      {
        id: 12,
        number: 8,
        title: 'Pull request item',
        html_url: 'https://github.com/octo-org/hello-world/pull/8',
        pull_request: {},
      },
    ])

    expect(issues).toEqual([
      {
        id: 11,
        number: 7,
        title: 'Fix sidebar flow',
        state: 'open',
        url: 'https://github.com/octo-org/hello-world/issues/7',
        author: 'mona',
        labels: ['bug', 'ui'],
        comments: 3,
        createdAt: '2026-04-27T00:00:00Z',
        updatedAt: '2026-04-28T00:00:00Z',
      },
    ])
  })

  it('persists GitHub auth and selected repository through storage helpers', () => {
    const storage = createMemoryStorage()

    saveGithubAuthToken('github_pat_test', storage)
    saveSelectedGithubRepository(repository, storage)

    expect(storage.getItem(GITHUB_AUTH_TOKEN_STORAGE_KEY)).toBe('github_pat_test')
    expect(loadGithubAuthToken(storage)).toBe('github_pat_test')
    expect(loadSelectedGithubRepository(storage)).toEqual(repository)

    clearGithubAuthToken(storage)
    clearSelectedGithubRepository(storage)

    expect(storage.getItem(GITHUB_AUTH_TOKEN_STORAGE_KEY)).toBeNull()
    expect(storage.getItem(GITHUB_SELECTED_REPOSITORY_STORAGE_KEY)).toBeNull()
  })
})
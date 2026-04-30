#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { access, cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_PORT = 43117
const DEFAULT_MAX_REVIEW_ROUNDS = 3
const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']
const DEFAULT_KNOWLEDGE_BASE_TARGET_PATH = 'docs/knowledge-base.md'
const DEFAULT_SKILL_CATALOG_DIR = fileURLToPath(new URL('../../.github/skills', import.meta.url))
const DEFAULT_REPOSITORY_SEARCH_DEPTH = 3
const KNOWLEDGE_BASE_SECTION_START = '<!-- tsumugi-loom:knowledge-base:start -->'
const KNOWLEDGE_BASE_SECTION_END = '<!-- tsumugi-loom:knowledge-base:end -->'
const SAFE_SKILL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/
const BASE_JSON_HEADERS = {
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

const command = process.argv[2] ?? 'serve'
const options = parseOptions(process.argv.slice(3))

if (command === 'serve') {
  serve(options)
}
else if (command === 'run') {
  runOnce(options).catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
else {
  console.error(`Unknown command: ${command}`)
  process.exitCode = 1
}

class RunnerHttpError extends Error {
  constructor(statusCode, message) {
    super(message)
    this.name = 'RunnerHttpError'
    this.statusCode = statusCode
  }
}

function serve(rawOptions) {
  const serviceRoot = resolve(rawOptions.serviceRoot ?? process.cwd())
  const initialRepoPath = rawOptions.repo ? resolve(rawOptions.repo) : null
  const skillCatalogDir = resolve(rawOptions.skillCatalog ?? DEFAULT_SKILL_CATALOG_DIR)
  const port = Number(rawOptions.port ?? DEFAULT_PORT)
  const dryRun = Boolean(rawOptions.dryRun)
  const dryRunReviewVerdict = rawOptions.dryRunReviewVerdict
  const artifactRootOption = rawOptions.artifactRoot
  const maxReviewRounds = Number(rawOptions.maxReviewRounds ?? DEFAULT_MAX_REVIEW_ROUNDS)
  const allowedOrigins = parseAllowedOrigins(rawOptions.allowedOrigin ?? process.env.TSUMUGI_RUNNER_ALLOWED_ORIGINS)
  const repositorySearchRoots = parseRepositorySearchRoots(
    rawOptions.repoRoot ?? process.env.TSUMUGI_RUNNER_REPO_ROOTS,
    serviceRoot,
    initialRepoPath,
  )
  const runs = new Map()
  let currentRepository = null
  let initialRepositoryPromise = initialRepoPath
    ? createRepositorySelectionFromPath(initialRepoPath, null).catch(() => null)
    : null

  async function getCurrentRepository() {
    if (!currentRepository && initialRepositoryPromise) {
      currentRepository = await initialRepositoryPromise
      initialRepositoryPromise = null
    }

    return currentRepository
  }

  const server = createServer(async (request, response) => {
    const corsHeaders = createCorsHeaders(request, allowedOrigins)

    if (request.method === 'OPTIONS') {
      sendJson(response, isAllowedOrigin(request, allowedOrigins) ? 204 : 403, null, corsHeaders)
      return
    }

    try {
      if (!isAllowedOrigin(request, allowedOrigins)) {
        sendJson(response, 403, { message: 'Origin is not allowed.' }, corsHeaders)
        return
      }

      if (request.method === 'GET' && request.url === '/status') {
        sendJson(response, 200, createRunnerStatusPayload({
          dryRun,
          repository: await getCurrentRepository(),
          repositorySearchRoots,
          serviceRoot,
          skillCatalogDir,
        }), corsHeaders)
        return
      }

      if (request.method === 'POST' && request.url === '/repository') {
        currentRepository = await resolveRepositorySelection(await readRequestJson(request), {
          searchRoots: repositorySearchRoots,
        })
        initialRepositoryPromise = null

        sendJson(response, 200, createRunnerStatusPayload({
          dryRun,
          repository: currentRepository,
          repositorySearchRoots,
          serviceRoot,
          skillCatalogDir,
        }), corsHeaders)
        return
      }

      const knowledgeBaseMatch = request.url?.match(/^\/runs\/([^/]+)\/knowledge-base$/)

      if (request.method === 'POST' && knowledgeBaseMatch) {
        const payload = await readRequestJson(request)
        const targetRepository = assertCurrentRepositoryMatchesPayload(payload, await getCurrentRepository(), {
          missingMessage: 'Knowledge Base update requires repository.fullName.',
        })
        const artifactRoot = resolveArtifactRoot(targetRepository.repoPath, artifactRootOption)
        const result = await updateKnowledgeBaseFromRun(decodeURIComponent(knowledgeBaseMatch[1]), payload, {
          artifactRoot,
          repoPath: targetRepository.repoPath,
        })

        sendJson(response, 200, result, corsHeaders)
        return
      }

      if (request.method === 'POST' && request.url === '/runs') {
        const payload = await readRequestJson(request)
        const workflowRun = validateWorkflowRunRequest(payload)
        const targetRepository = assertCurrentRepositoryMatchesWorkflowRun(workflowRun, await getCurrentRepository())
        const artifactRoot = resolveArtifactRoot(targetRepository.repoPath, artifactRootOption)

        const runDir = join(artifactRoot, sanitizePathPart(workflowRun.runId))
        const runState = {
          runId: workflowRun.runId,
          status: 'queued',
          artifactDir: relative(targetRepository.repoPath, runDir),
          currentNodeId: null,
          errorMessage: null,
        }

          runs.set(workflowRun.runId, runState)
          sendJson(response, 202, runState, corsHeaders)

        executeWorkflowRun(workflowRun, {
          artifactRoot,
          dryRun,
          dryRunReviewVerdict,
          maxReviewRounds,
          repoPath: targetRepository.repoPath,
          skillCatalogDir,
          onStateChange: (nextState) => {
            runs.set(workflowRun.runId, { ...runState, ...runs.get(workflowRun.runId), ...nextState })
          },
        }).catch((error) => {
          runs.set(workflowRun.runId, {
            ...runState,
            ...runs.get(workflowRun.runId),
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Workflow run failed.',
          })
        })
        return
      }

      const runMatch = request.url?.match(/^\/runs\/([^/]+)$/)

      if (request.method === 'GET' && runMatch) {
        const runState = runs.get(runMatch[1])

        if (!runState) {
          sendJson(response, 404, { message: 'Workflow run was not found.' }, corsHeaders)
          return
        }

        sendJson(response, 200, runState, corsHeaders)
        return
      }

      sendJson(response, 404, { message: 'Route was not found.' }, corsHeaders)
    }
    catch (error) {
      sendJson(response, error instanceof RunnerHttpError ? error.statusCode : 400, {
        message: error instanceof Error ? error.message : 'Invalid workflow run request.',
      }, corsHeaders)
    }
  })

  server.listen(port, '127.0.0.1', () => {
    console.log(`Copilot workflow runner listening on http://127.0.0.1:${port}`)
    console.log(`Service root: ${serviceRoot}`)
    console.log(`Repository roots: ${repositorySearchRoots.join(', ')}`)
    console.log(`Skill catalog: ${skillCatalogDir}`)
    console.log(`Mode: ${dryRun ? 'dry-run' : 'copilot-cli'}`)
    console.log(`Allowed origins: ${Array.from(allowedOrigins).join(', ')}`)
  })
}

async function runOnce(rawOptions) {
  if (!rawOptions.payload) {
    throw new Error('Missing --payload <file> for run command.')
  }

  const repoPath = resolve(rawOptions.repo ?? process.cwd())
  const skillCatalogDir = resolve(rawOptions.skillCatalog ?? DEFAULT_SKILL_CATALOG_DIR)
  const artifactRoot = resolve(repoPath, rawOptions.artifactRoot ?? 'artifacts/runs')
  const payload = JSON.parse(await readFile(resolve(rawOptions.payload), 'utf8'))
  const workflowRun = validateWorkflowRunRequest(payload)

  if (workflowRun.repository?.fullName) {
    await assertWorkflowRunRepositoryMatches(workflowRun, repoPath)
  }

  const result = await executeWorkflowRun(workflowRun, {
    artifactRoot,
    dryRun: Boolean(rawOptions.dryRun),
    dryRunReviewVerdict: rawOptions.dryRunReviewVerdict,
    maxReviewRounds: Number(rawOptions.maxReviewRounds ?? DEFAULT_MAX_REVIEW_ROUNDS),
    repoPath,
    skillCatalogDir,
  })

  console.log(JSON.stringify(result, null, 2))
}

async function executeWorkflowRun(workflowRun, options) {
  const runDir = join(options.artifactRoot, sanitizePathPart(workflowRun.runId))
  const inputDir = join(runDir, 'input')
  const nodesDir = join(runDir, 'nodes')
  const skillSnapshotDir = join(runDir, 'skills')
  const nodeAttempts = new Map()
  const completedNodeRuns = []
  const maxReviewRounds = Number(workflowRun.options?.maxReviewRounds ?? options.maxReviewRounds)
  let reviewRounds = 0
  let nodeIndex = 0

  await mkdir(inputDir, { recursive: true })
  await mkdir(nodesDir, { recursive: true })
  await mkdir(skillSnapshotDir, { recursive: true })
  await writeJson(join(inputDir, 'issue.json'), workflowRun.issue)
  await writeJson(join(inputDir, 'workflow.json'), workflowRun.workflow)
  await writeJson(join(inputDir, 'request.json'), workflowRun)
  await snapshotSkills(workflowRun.workflow.nodes, options.skillCatalogDir, skillSnapshotDir)
  await writeRunManifest(runDir, workflowRun, 'running')
  options.onStateChange?.({ status: 'running' })

  while (nodeIndex < workflowRun.workflow.nodes.length) {
    const node = workflowRun.workflow.nodes[nodeIndex]
    const attempt = (nodeAttempts.get(node.nodeId) ?? 0) + 1
    const nodeRunDir = join(
      nodesDir,
      `${padNodeOrder(node.order)}-${sanitizePathPart(node.nodeId)}-attempt-${attempt}`,
    )

    nodeAttempts.set(node.nodeId, attempt)
    options.onStateChange?.({ currentNodeId: node.nodeId, status: 'running' })

    const nodeResult = await runNodeSession({
      attempt,
      completedNodeRuns,
      node,
      nodeRunDir,
      repoPath: options.repoPath,
      runDir,
      workflowRun,
      dryRun: options.dryRun,
      dryRunReviewVerdict: options.dryRunReviewVerdict,
    })

    completedNodeRuns.push({ node, nodeRunDir, nodeResult })

    if (nodeResult.status === 'failed') {
      await writeRunManifest(runDir, workflowRun, 'failed', nodeResult.summary)
      options.onStateChange?.({ status: 'failed', errorMessage: nodeResult.summary ?? 'Node session failed.' })
      return { runId: workflowRun.runId, status: 'failed', artifactDir: runDir }
    }

    if (isReviewNode(node) && nodeResult.verdict === 'changes_requested') {
      reviewRounds += 1

      if (reviewRounds >= maxReviewRounds) {
        await writeRunManifest(runDir, workflowRun, 'failed', 'Review did not approve within the configured round limit.')
        options.onStateChange?.({
          status: 'failed',
          errorMessage: 'Review did not approve within the configured round limit.',
        })
        return { runId: workflowRun.runId, status: 'failed', artifactDir: runDir }
      }

      nodeIndex = Math.max(0, nodeIndex - 1)
      continue
    }

    if (isReviewNode(node) && nodeResult.verdict === 'approved') {
      await writeRunManifest(runDir, workflowRun, 'completed')
      options.onStateChange?.({ currentNodeId: null, status: 'completed' })
      return { runId: workflowRun.runId, status: 'completed', artifactDir: runDir }
    }

    nodeIndex += 1
  }

  await writeRunManifest(runDir, workflowRun, 'completed')
  options.onStateChange?.({ currentNodeId: null, status: 'completed' })

  return { runId: workflowRun.runId, status: 'completed', artifactDir: runDir }
}

async function updateKnowledgeBaseFromRun(runId, payload, { artifactRoot, repoPath }) {
  const normalizedRunId = validateKnowledgeBaseUpdateRequest(runId, payload)
  const runDir = join(artifactRoot, sanitizePathPart(normalizedRunId))
  const targetPath = getKnowledgeBaseTargetPath(payload)
  const targetFilePath = resolve(repoPath, targetPath)

  assertPathWithin(runDir, artifactRoot, 'Workflow run artifact path is outside the artifact root.')
  assertPathWithin(targetFilePath, repoPath, 'Knowledge Base target path is outside the repository.')

  const manifest = await readJsonFile(join(runDir, 'manifest.json'), 'Workflow run manifest was not found.')

  if (manifest.runId !== normalizedRunId) {
    throw new RunnerHttpError(409, 'Workflow run manifest does not match the requested run id.')
  }

  if (manifest.status !== 'completed') {
    throw new RunnerHttpError(409, 'Workflow run must be completed before updating the Knowledge Base.')
  }

  const requestedRepositoryFullName = getRequestedRepositoryFullName(payload)

  if (!requestedRepositoryFullName) {
    throw new RunnerHttpError(400, 'Knowledge Base update requires repository.fullName.')
  }

  const runnerRepositoryFullName = await readRepositoryFullName(repoPath)

  if (!runnerRepositoryFullName) {
    throw new RunnerHttpError(409, 'Runner repository could not be resolved.')
  }

  if (runnerRepositoryFullName.toLowerCase() !== requestedRepositoryFullName.toLowerCase()) {
    throw new RunnerHttpError(409, 'Runner repository does not match the requested repository.')
  }

  const issue = await readJsonFile(join(runDir, 'input', 'issue.json'), 'Workflow run issue snapshot was not found.')
  const workflow = await readJsonFile(join(runDir, 'input', 'workflow.json'), 'Workflow run workflow snapshot was not found.')
  const nodeRuns = await readNodeRunArtifacts(runDir)
  const artifactSources = await readKnowledgeArtifactSources(nodeRuns, repoPath)
  const facts = deriveKnowledgeFacts({ artifactSources, issue, nodeRuns, runId: normalizedRunId, workflow })
  const entry = buildKnowledgeBaseEntry({ artifactSources, facts, issue, runId: normalizedRunId, workflow })
  const existingDocument = await readOptionalTextFile(targetFilePath)
  const nextDocument = mergeKnowledgeBaseDocument(existingDocument, normalizedRunId, entry)
  const updateArtifactPath = join(runDir, 'knowledge-base', 'update.json')
  const sourceArtifacts = [
    toRepositoryRelativePath(join(runDir, 'input', 'issue.json'), repoPath),
    toRepositoryRelativePath(join(runDir, 'input', 'workflow.json'), repoPath),
    ...nodeRuns.map((nodeRun) => toRepositoryRelativePath(nodeRun.resultPath, repoPath)),
    ...artifactSources.map((source) => source.path),
  ]
  const uniqueSourceArtifacts = Array.from(new Set(sourceArtifacts))

  await mkdir(resolve(repoPath, 'docs'), { recursive: true })
  await writeFile(targetFilePath, nextDocument)
  await mkdir(join(runDir, 'knowledge-base'), { recursive: true })
  await writeJson(updateArtifactPath, {
    runId: normalizedRunId,
    targetPath,
    factCount: facts.length,
    sourceArtifacts: uniqueSourceArtifacts,
    updatedAt: new Date().toISOString(),
  })

  return {
    runId: normalizedRunId,
    status: 'updated',
    targetPath,
    factCount: facts.length,
    sourceArtifacts: uniqueSourceArtifacts,
    updateArtifact: toRepositoryRelativePath(updateArtifactPath, repoPath),
  }
}

function validateKnowledgeBaseUpdateRequest(runId, payload) {
  if (!runId || !String(runId).trim()) {
    throw new RunnerHttpError(400, 'Knowledge Base update requires a run id.')
  }

  if (!isRecord(payload)) {
    throw new RunnerHttpError(400, 'Request body must be a JSON object.')
  }

  const normalizedRunId = String(runId).trim()

  if (typeof payload.runId === 'string' && payload.runId.trim() && payload.runId.trim() !== normalizedRunId) {
    throw new RunnerHttpError(400, 'Request run id does not match the route run id.')
  }

  return normalizedRunId
}

function getKnowledgeBaseTargetPath(payload) {
  const targetPath = isRecord(payload.target) && typeof payload.target.path === 'string'
    ? payload.target.path.trim()
    : DEFAULT_KNOWLEDGE_BASE_TARGET_PATH

  if (targetPath !== DEFAULT_KNOWLEDGE_BASE_TARGET_PATH) {
    throw new RunnerHttpError(400, 'Knowledge Base target path is not supported.')
  }

  return targetPath
}

function getRequestedRepositoryFullName(payload) {
  return isRecord(payload.repository) && typeof payload.repository.fullName === 'string'
    ? payload.repository.fullName.trim()
    : null
}

function createRunnerStatusPayload({
  dryRun,
  repository,
  repositorySearchRoots,
  serviceRoot,
  skillCatalogDir = DEFAULT_SKILL_CATALOG_DIR,
}) {
  return {
    serviceRoot,
    repoPath: repository?.repoPath ?? null,
    skillCatalogPath: skillCatalogDir,
    repositoryFullName: repository?.repositoryFullName ?? null,
    selectedRepository: repository?.repository ?? null,
    repositorySearchRoots,
    mode: dryRun ? 'dry-run' : 'copilot-cli',
    capabilities: {
      knowledgeBaseUpdates: true,
      repositorySelection: true,
    },
  }
}

function parseRepositorySearchRoots(value, serviceRoot, initialRepoPath) {
  const roots = typeof value === 'string' && value.trim()
    ? value.split(',').map((root) => root.trim()).filter(Boolean)
    : [serviceRoot, dirname(serviceRoot)]

  if (initialRepoPath) {
    roots.unshift(initialRepoPath)
  }

  return Array.from(new Set(roots.map((root) => resolve(root))))
}

function resolveArtifactRoot(repoPath, artifactRootOption) {
  return resolve(repoPath, artifactRootOption ?? 'artifacts/runs')
}

async function resolveRepositorySelection(payload, { searchRoots }) {
  const requestedRepository = normalizeRepositorySelectionPayload(payload)
  const pathHint = getRepositoryPathHint(payload)

  if (pathHint) {
    const repoPath = resolve(pathHint)

    if (!searchRoots.some((searchRoot) => isPathWithin(repoPath, searchRoot))) {
      throw new RunnerHttpError(403, 'Selected repository path is outside the configured repository roots.')
    }

    return createRepositorySelectionFromPath(repoPath, requestedRepository)
  }

  const repoPath = await findRepositoryPathByFullName(requestedRepository.fullName, searchRoots)

  if (!repoPath) {
    throw new RunnerHttpError(409, `Selected repository could not be resolved on this machine: ${requestedRepository.fullName}`)
  }

  return createRepositorySelectionFromPath(repoPath, requestedRepository)
}

function normalizeRepositorySelectionPayload(payload) {
  const repository = isRecord(payload?.repository) ? payload.repository : payload

  if (!isRecord(repository) || typeof repository.fullName !== 'string' || !repository.fullName.trim()) {
    throw new RunnerHttpError(400, 'Selected repository requires repository.fullName.')
  }

  const [fallbackOwner = '', fallbackName = ''] = repository.fullName.trim().split('/')

  return {
    owner: typeof repository.owner === 'string' && repository.owner.trim()
      ? repository.owner.trim()
      : fallbackOwner,
    name: typeof repository.name === 'string' && repository.name.trim()
      ? repository.name.trim()
      : fallbackName,
    fullName: repository.fullName.trim(),
    remoteUrl: typeof repository.remoteUrl === 'string' ? repository.remoteUrl.trim() : '',
    localName: typeof repository.localName === 'string' && repository.localName.trim()
      ? repository.localName.trim()
      : fallbackName || 'Repository',
  }
}

function getRepositoryPathHint(payload) {
  if (!isRecord(payload)) {
    return null
  }

  if (typeof payload.repoPath === 'string' && payload.repoPath.trim()) {
    return payload.repoPath.trim()
  }

  if (typeof payload.localPath === 'string' && payload.localPath.trim()) {
    return payload.localPath.trim()
  }

  if (isRecord(payload.repository)) {
    if (typeof payload.repository.repoPath === 'string' && payload.repository.repoPath.trim()) {
      return payload.repository.repoPath.trim()
    }

    if (typeof payload.repository.localPath === 'string' && payload.repository.localPath.trim()) {
      return payload.repository.localPath.trim()
    }
  }

  return null
}

async function createRepositorySelectionFromPath(repoPath, requestedRepository) {
  const repositoryFullName = await readRepositoryFullName(repoPath)

  if (!repositoryFullName) {
    throw new RunnerHttpError(409, 'Selected repository could not be resolved on this machine.')
  }

  if (requestedRepository && repositoryFullName.toLowerCase() !== requestedRepository.fullName.toLowerCase()) {
    throw new RunnerHttpError(409, 'Selected repository path does not match the requested repository.')
  }

  const [owner = '', name = ''] = repositoryFullName.split('/')

  return {
    repoPath,
    repositoryFullName,
    repository: {
      owner: requestedRepository?.owner || owner,
      name: requestedRepository?.name || name,
      fullName: repositoryFullName,
      remoteUrl: requestedRepository?.remoteUrl ?? '',
      localName: requestedRepository?.localName || basename(repoPath),
    },
    selectedAt: new Date().toISOString(),
  }
}

async function findRepositoryPathByFullName(repositoryFullName, searchRoots) {
  const normalizedRepositoryFullName = repositoryFullName.toLowerCase()

  for (const searchRoot of searchRoots) {
    const repoPath = await findRepositoryPathInTree(searchRoot, normalizedRepositoryFullName, DEFAULT_REPOSITORY_SEARCH_DEPTH)

    if (repoPath) {
      return repoPath
    }
  }

  return null
}

async function findRepositoryPathInTree(directoryPath, normalizedRepositoryFullName, remainingDepth) {
  const repositoryFullName = await readRepositoryFullName(directoryPath)

  if (repositoryFullName?.toLowerCase() === normalizedRepositoryFullName) {
    return directoryPath
  }

  if (remainingDepth <= 0) {
    return null
  }

  const entries = await readdir(directoryPath, { withFileTypes: true }).catch(() => [])

  for (const entry of entries) {
    if (!entry.isDirectory() || shouldSkipRepositorySearchEntry(entry.name)) {
      continue
    }

    const repoPath = await findRepositoryPathInTree(
      join(directoryPath, entry.name),
      normalizedRepositoryFullName,
      remainingDepth - 1,
    )

    if (repoPath) {
      return repoPath
    }
  }

  return null
}

function shouldSkipRepositorySearchEntry(name) {
  return [
    '.git',
    'node_modules',
    'dist',
    'build',
    'coverage',
    'test-results',
    'artifacts',
    '.DS_Store',
  ].includes(name)
}

async function readRepositoryFullName(repoPath) {
  try {
    return parseGithubRepositoryFullNameFromGitConfig(await readFile(join(repoPath, '.git', 'config'), 'utf8'))
  }
  catch {
    return null
  }
}

function parseGithubRepositoryFullNameFromGitConfig(gitConfig) {
  const remotes = []
  let currentRemoteName = null

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
      return `${repository.owner}/${repository.name}`
    }
  }

  return null
}

function parseGithubRepositoryFromRemote(remoteUrl) {
  const normalizedRemoteUrl = String(remoteUrl).trim()

  if (!normalizedRemoteUrl) {
    return null
  }

  try {
    const remote = new URL(normalizedRemoteUrl)

    if (remote.hostname.toLowerCase() !== 'github.com') {
      return null
    }

    const [owner, rawName] = remote.pathname.replace(/^\//, '').split('/')
    const name = normalizeRepositoryName(rawName ?? '')

    return owner && name ? { owner, name } : null
  }
  catch {
    const sshMatch = normalizedRemoteUrl.match(/^(?:ssh:\/\/)?(?:git@)?github\.com(?::|\/)([^\s/]+)\/([^\s/]+)$/i)

    if (!sshMatch) {
      return null
    }

    const [, owner, rawName] = sshMatch
    const name = normalizeRepositoryName(rawName)

    return owner && name ? { owner, name } : null
  }
}

function normalizeRepositoryName(name) {
  return name.trim().replace(/\.git$/i, '')
}

async function readNodeRunArtifacts(runDir) {
  const nodesDir = join(runDir, 'nodes')
  const entries = await readdir(nodesDir, { withFileTypes: true }).catch(() => [])
  const nodeRuns = []

  for (const entry of entries.filter((item) => item.isDirectory()).sort((first, second) => first.name.localeCompare(second.name))) {
    const nodeRunDir = join(nodesDir, entry.name)
    const resultPath = join(nodeRunDir, 'node-result.json')
    const result = await readJsonFile(resultPath, null).catch(() => null)

    if (result) {
      nodeRuns.push({ nodeRunDir, result, resultPath })
    }
  }

  return nodeRuns
}

async function readKnowledgeArtifactSources(nodeRuns, repoPath) {
  const sources = []
  const seenPaths = new Set()

  for (const nodeRun of nodeRuns) {
    const declaredArtifacts = Array.isArray(nodeRun.result.artifacts)
      ? nodeRun.result.artifacts.filter((artifact) => typeof artifact === 'string')
      : []

    for (const artifact of declaredArtifacts) {
      const artifactPath = resolve(repoPath, artifact)

      assertPathWithin(artifactPath, repoPath, `Knowledge artifact path is outside the repository: ${artifact}`)

      if (seenPaths.has(artifactPath) || !isReadableKnowledgeArtifact(artifactPath)) {
        continue
      }

      const content = await readOptionalTextFile(artifactPath)

      if (!content) {
        continue
      }

      seenPaths.add(artifactPath)
      sources.push({
        path: toRepositoryRelativePath(artifactPath, repoPath),
        title: basename(artifactPath),
        content,
      })
    }
  }

  return sources
}

function isReadableKnowledgeArtifact(filePath) {
  return ['.md', '.txt'].includes(extname(filePath).toLowerCase())
}

function deriveKnowledgeFacts({ artifactSources, issue, nodeRuns, runId, workflow }) {
  const facts = []
  const seenFacts = new Set()
  const pushFact = (fact) => {
    const normalizedFact = String(fact).replace(/\s+/g, ' ').trim()

    if (!normalizedFact || seenFacts.has(normalizedFact)) {
      return
    }

    seenFacts.add(normalizedFact)
    facts.push(normalizedFact)
  }

  pushFact(`Issue #${issue.number}: ${issue.title}`)
  pushFact(`Workflow "${workflow.name ?? workflow.id ?? 'Workflow'}" completed run ${runId}.`)

  for (const nodeRun of nodeRuns) {
    if (typeof nodeRun.result.summary === 'string' && nodeRun.result.summary.trim()) {
      pushFact(nodeRun.result.summary)
    }
  }

  for (const source of artifactSources) {
    for (const fact of extractFactLines(source.content)) {
      pushFact(fact)
    }
  }

  return facts
}

function extractFactLines(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s{0,3}(?:[-*+]\s+|\d+\.\s+|#{1,6}\s+)/, '').trim())
    .filter((line) => line.length >= 12 && !/^todo\b/i.test(line) && !/^plan$/i.test(line))
    .slice(0, 12)
}

function buildKnowledgeBaseEntry({ artifactSources, facts, issue, runId, workflow }) {
  const entryStart = createKnowledgeEntryStart(runId)
  const entryEnd = createKnowledgeEntryEnd(runId)
  const factLines = facts.map((fact) => `- ${fact}`).join('\n') || '- No stable facts were extracted.'
  const sourceLines = artifactSources
    .map((source) => `- ${source.path}`)
    .join('\n') || '- Run input snapshots and node-result artifacts.'

  return `${entryStart}
### Issue #${issue.number}: ${issue.title}

- Run ID: ${runId}
- Workflow: ${workflow.name ?? workflow.id ?? 'Workflow'}

#### Facts
${factLines}

#### Sources
${sourceLines}
${entryEnd}`
}

function mergeKnowledgeBaseDocument(existingDocument, runId, entry) {
  const normalizedExisting = existingDocument?.trimEnd()
    || '# Knowledge Base'
  const managedSection = `${KNOWLEDGE_BASE_SECTION_START}\n## Tsumugi Loom Managed Knowledge\n\n${entry}\n${KNOWLEDGE_BASE_SECTION_END}`
  const sectionStartCount = countOccurrences(normalizedExisting, KNOWLEDGE_BASE_SECTION_START)
  const sectionEndCount = countOccurrences(normalizedExisting, KNOWLEDGE_BASE_SECTION_END)

  if (sectionStartCount !== sectionEndCount || sectionStartCount > 1) {
    throw new RunnerHttpError(409, 'Knowledge Base managed section markers are malformed.')
  }

  if (sectionStartCount === 0) {
    return `${normalizedExisting}\n\n${managedSection}\n`
  }

  if (normalizedExisting.indexOf(KNOWLEDGE_BASE_SECTION_START) > normalizedExisting.indexOf(KNOWLEDGE_BASE_SECTION_END)) {
    throw new RunnerHttpError(409, 'Knowledge Base managed section markers are malformed.')
  }

  const entryPattern = new RegExp(
    `${escapeRegExp(createKnowledgeEntryStart(runId))}[\\s\\S]*?${escapeRegExp(createKnowledgeEntryEnd(runId))}`,
  )

  if (entryPattern.test(normalizedExisting)) {
    return `${normalizedExisting.replace(entryPattern, entry)}\n`
  }

  return `${normalizedExisting.replace(KNOWLEDGE_BASE_SECTION_END, `${entry}\n${KNOWLEDGE_BASE_SECTION_END}`)}\n`
}

function countOccurrences(value, search) {
  let count = 0
  let index = value.indexOf(search)

  while (index !== -1) {
    count += 1
    index = value.indexOf(search, index + search.length)
  }

  return count
}

function createKnowledgeEntryStart(runId) {
  return `<!-- tsumugi-loom:entry:start runId=${runId} -->`
}

function createKnowledgeEntryEnd(runId) {
  return `<!-- tsumugi-loom:entry:end runId=${runId} -->`
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function readOptionalTextFile(filePath) {
  try {
    return await readFile(filePath, 'utf8')
  }
  catch {
    return null
  }
}

async function readJsonFile(filePath, missingMessage) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'))
  }
  catch {
    if (missingMessage) {
      throw new RunnerHttpError(404, missingMessage)
    }

    throw new Error(`JSON file could not be read: ${filePath}`)
  }
}

function toRepositoryRelativePath(filePath, repoPath) {
  const relativePath = relative(repoPath, filePath)

  return relativePath && !relativePath.startsWith('..') && !isAbsolute(relativePath)
    ? relativePath
    : filePath
}

async function runNodeSession({
  attempt,
  completedNodeRuns,
  node,
  nodeRunDir,
  repoPath,
  runDir,
  workflowRun,
  dryRun,
  dryRunReviewVerdict,
}) {
  await mkdir(nodeRunDir, { recursive: true })

  const prompt = buildNodePrompt({ attempt, completedNodeRuns, node, nodeRunDir, repoPath, runDir, workflowRun })
  const promptPath = join(nodeRunDir, 'prompt.md')
  const resultPath = join(nodeRunDir, 'node-result.json')

  await writeFile(promptPath, prompt)

  if (dryRun) {
    const dryRunResult = {
      status: 'completed',
      verdict: getDryRunVerdict(node, attempt, dryRunReviewVerdict),
      artifacts: [],
      summary: `Dry run completed ${node.nodeId}.`,
    }

    await writeJson(resultPath, dryRunResult)
    return dryRunResult
  }

  const exitCode = await runCopilotCli({ nodeRunDir, prompt, repoPath, runDir })
  const result = await readNodeResult(resultPath, node)

  if (exitCode !== 0) {
    const failedResult = {
      status: 'failed',
      verdict: null,
      artifacts: result?.artifacts ?? [],
      summary: result?.summary
        ? `${result.summary}\nCopilot CLI exited with code ${exitCode}.`
        : `Copilot CLI exited with code ${exitCode}.`,
    }

    await writeJson(resultPath, failedResult)
    return failedResult
  }

  if (!result) {
    const missingResult = {
      status: 'failed',
      verdict: null,
      artifacts: [],
      summary: 'Copilot CLI completed but node-result.json was not written.',
    }

    await writeJson(resultPath, missingResult)
    return missingResult
  }

  await writeJson(resultPath, result)
  return result
}

function getDryRunVerdict(node, attempt, dryRunReviewVerdict) {
  if (!isReviewNode(node)) {
    return null
  }

  if (dryRunReviewVerdict === 'changes_requested' && attempt === 1) {
    return 'changes_requested'
  }

  return 'approved'
}

function buildNodePrompt({ attempt, completedNodeRuns, node, nodeRunDir, repoPath, runDir, workflowRun }) {
  const previousArtifacts = completedNodeRuns
    .map((nodeRun) => `- ${relative(repoPath, nodeRun.nodeRunDir)} (${nodeRun.node.nodeId})`)
    .join('\n') || '- None'
  const skillPath = join(runDir, 'skills', node.skillId, 'SKILL.md')

  return `# Copilot Workflow Node Session

You are executing one node of a Tsumugi Loom workflow run.

## Session Boundary

- This Copilot CLI process is a fresh node session.
- Do not rely on previous chat/session memory.
- Use only the files and artifacts listed in this prompt as context.
- The runner intentionally does not pass --continue, --resume, or --connect between nodes.

## Node

- Run ID: ${workflowRun.runId}
- Node ID: ${node.nodeId}
- Node Name: ${node.name}
- Node Attempt: ${attempt}
- Skill ID: ${node.skillId}
- Skill File: ${skillPath}

## Required Skill Loading

Before doing node work, read and obey the skill file at:

${skillPath}

If that skill references local assets or references, resolve them relative to ${join(runDir, 'skills', node.skillId)}.

## Inputs

- Repository root: ${repoPath}
- Run directory: ${runDir}
- Issue snapshot: ${join(runDir, 'input', 'issue.json')}
- Workflow snapshot: ${join(runDir, 'input', 'workflow.json')}
- Full run request: ${join(runDir, 'input', 'request.json')}
- Previous node artifacts:
${previousArtifacts}

## Output Contract

Write this node result JSON file before exiting:

${join(nodeRunDir, 'node-result.json')}

Use this shape:

{
  "status": "completed" | "failed",
  "verdict": "approved" | "changes_requested" | null,
  "artifacts": ["relative/path/from/repository/root"],
  "summary": "short human-readable node result"
}

For review nodes, set verdict to "approved" or "changes_requested". For non-review nodes, set verdict to null.
`
}

function runCopilotCli({ nodeRunDir, prompt, repoPath, runDir }) {
  return new Promise((resolvePromise) => {
    const copilot = spawn(process.env.COPILOT_CLI_BIN ?? 'copilot', [
      '--prompt', prompt,
      '--output-format', 'json',
      '--add-dir', repoPath,
      '--add-dir', runDir,
      '--log-dir', join(nodeRunDir, 'logs'),
    ], {
      cwd: repoPath,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const stdout = []
    const stderr = []

    copilot.stdout.on('data', (chunk) => stdout.push(chunk))
    copilot.stderr.on('data', (chunk) => stderr.push(chunk))
    copilot.on('error', async (error) => {
      await writeFile(join(nodeRunDir, 'stderr.log'), String(error.message))
      resolvePromise(1)
    })
    copilot.on('close', async (code) => {
      await writeFile(join(nodeRunDir, 'stdout.log'), Buffer.concat(stdout))
      await writeFile(join(nodeRunDir, 'stderr.log'), Buffer.concat(stderr))
      resolvePromise(code ?? 1)
    })
  })
}

async function snapshotSkills(nodes, skillCatalogDir, skillSnapshotDir) {
  const skillIds = Array.from(new Set(nodes.map((node) => node.skillId)))
  const sourceCatalogDir = resolve(skillCatalogDir)
  const skillSnapshotRoot = resolve(skillSnapshotDir)

  for (const skillId of skillIds) {
    const sourceDir = resolve(sourceCatalogDir, skillId)
    const targetDir = resolve(skillSnapshotRoot, skillId)

    assertPathWithin(sourceDir, sourceCatalogDir, `Skill ID is outside the skill catalog: ${skillId}`)
    assertPathWithin(targetDir, skillSnapshotRoot, `Skill ID is outside the run skill snapshot directory: ${skillId}`)

    await assertReadable(sourceDir, `Skill directory was not found: ${sourceDir}`)
    await cp(sourceDir, targetDir, { recursive: true, force: true })
  }
}

async function readNodeResult(resultPath, node) {
  try {
    return normalizeNodeResult(JSON.parse(await readFile(resultPath, 'utf8')), node)
  }
  catch {
    return null
  }
}

function normalizeNodeResult(payload, node) {
  if (!isRecord(payload)) {
    return null
  }

  const artifacts = Array.isArray(payload.artifacts)
    ? payload.artifacts.filter((artifact) => typeof artifact === 'string')
    : []
  const summary = typeof payload.summary === 'string' ? payload.summary : ''

  if (payload.status !== 'completed' && payload.status !== 'failed') {
    return {
      status: 'failed',
      verdict: null,
      artifacts,
      summary: 'node-result.json status must be "completed" or "failed".',
    }
  }

  const status = payload.status
  const verdict = payload.verdict === 'approved' || payload.verdict === 'changes_requested'
    ? payload.verdict
    : null

  if (status === 'completed' && isReviewNode(node) && !verdict) {
    return {
      status: 'failed',
      verdict: null,
      artifacts,
      summary: 'Review node-result.json must include verdict "approved" or "changes_requested".',
    }
  }

  return { status, verdict, artifacts, summary }
}

function validateWorkflowRunRequest(payload) {
  if (!isRecord(payload)) {
    throw new Error('Request body must be a JSON object.')
  }

  if (typeof payload.runId !== 'string' || !payload.runId.trim()) {
    throw new Error('Request body must include runId.')
  }

  if (!isRecord(payload.issue)) {
    throw new Error('Request body must include issue snapshot.')
  }

  const repository = normalizeWorkflowRunRepository(payload.repository)

  if (!isRecord(payload.workflow) || !Array.isArray(payload.workflow.nodes)) {
    throw new Error('Request body must include workflow nodes.')
  }

  const nodes = payload.workflow.nodes.map((node) => {
    if (!isRecord(node) || typeof node.nodeId !== 'string' || typeof node.name !== 'string') {
      throw new Error('Each workflow node must include nodeId and name.')
    }

    if (typeof node.skillId !== 'string' || !node.skillId.trim()) {
      throw new Error(`Workflow node ${node.nodeId} is missing skillId.`)
    }

    const skillId = node.skillId.trim()

    if (!isSafeSkillId(skillId)) {
      throw new Error(`Workflow node ${node.nodeId} has invalid skillId.`)
    }

    return {
      order: typeof node.order === 'number' ? node.order : 0,
      nodeId: node.nodeId,
      name: node.name,
      skillId,
    }
  }).sort((firstNode, secondNode) => firstNode.order - secondNode.order)

  const workflowRun = {
    ...payload,
    runId: payload.runId.trim(),
    workflow: {
      ...payload.workflow,
      id: typeof payload.workflow.id === 'string' ? payload.workflow.id : 'workflow',
      name: typeof payload.workflow.name === 'string' ? payload.workflow.name : 'Workflow',
      nodes,
    },
  }

  if (repository) {
    workflowRun.repository = repository
  }
  else {
    delete workflowRun.repository
  }

  return workflowRun
}

function normalizeWorkflowRunRepository(repository) {
  if (!isRecord(repository) || typeof repository.fullName !== 'string' || !repository.fullName.trim()) {
    return null
  }

  return {
    owner: typeof repository.owner === 'string' ? repository.owner.trim() : '',
    name: typeof repository.name === 'string' ? repository.name.trim() : '',
    fullName: repository.fullName.trim(),
  }
}

async function assertWorkflowRunRepositoryMatches(workflowRun, repoPath) {
  const requestedRepositoryFullName = workflowRun.repository?.fullName

  if (!requestedRepositoryFullName) {
    throw new RunnerHttpError(400, 'Workflow run request requires repository.fullName.')
  }

  const runnerRepositoryFullName = await readRepositoryFullName(repoPath)

  if (!runnerRepositoryFullName) {
    throw new RunnerHttpError(409, 'Runner repository could not be resolved.')
  }

  if (runnerRepositoryFullName.toLowerCase() !== requestedRepositoryFullName.toLowerCase()) {
    throw new RunnerHttpError(409, 'Runner repository does not match the requested repository.')
  }
}

function assertCurrentRepositoryMatchesWorkflowRun(workflowRun, currentRepository) {
  return assertCurrentRepositoryMatchesFullName(
    workflowRun.repository?.fullName,
    currentRepository,
    'Workflow run request requires repository.fullName.',
  )
}

function assertCurrentRepositoryMatchesPayload(payload, currentRepository, { missingMessage }) {
  return assertCurrentRepositoryMatchesFullName(
    getRequestedRepositoryFullName(payload),
    currentRepository,
    missingMessage,
  )
}

function assertCurrentRepositoryMatchesFullName(requestedRepositoryFullName, currentRepository, missingMessage) {
  if (!requestedRepositoryFullName) {
    throw new RunnerHttpError(400, missingMessage)
  }

  if (!currentRepository) {
    throw new RunnerHttpError(409, 'Runner has not received a selected repository from the frontend.')
  }

  if (currentRepository.repositoryFullName.toLowerCase() !== requestedRepositoryFullName.toLowerCase()) {
    throw new RunnerHttpError(409, 'Runner current repository does not match the requested repository.')
  }

  return currentRepository
}

async function readRequestJson(request) {
  const chunks = []

  for await (const chunk of request) {
    chunks.push(chunk)
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, { ...BASE_JSON_HEADERS, ...headers })
  response.end(payload === null ? '' : JSON.stringify(payload))
}

function parseAllowedOrigins(value) {
  const origins = typeof value === 'string' && value.trim()
    ? value.split(',').map((origin) => origin.trim()).filter(Boolean)
    : DEFAULT_ALLOWED_ORIGINS

  return new Set(origins)
}

function createCorsHeaders(request, allowedOrigins) {
  const origin = request.headers.origin

  if (typeof origin === 'string' && allowedOrigins.has(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      Vary: 'Origin',
    }
  }

  return { Vary: 'Origin' }
}

function isAllowedOrigin(request, allowedOrigins) {
  const origin = request.headers.origin
  return typeof origin !== 'string' || allowedOrigins.has(origin)
}

async function writeRunManifest(runDir, workflowRun, status, errorMessage = null) {
  await writeJson(join(runDir, 'manifest.json'), {
    runId: workflowRun.runId,
    issueNumber: workflowRun.issue.number,
    workflowId: workflowRun.workflow.id,
    status,
    errorMessage,
    updatedAt: new Date().toISOString(),
  })
}

async function writeJson(filePath, payload) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`)
}

async function assertReadable(filePath, message) {
  try {
    await access(filePath, constants.R_OK)
  }
  catch {
    throw new Error(message)
  }
}

function assertPathWithin(filePath, parentPath, message) {
  if (!isPathWithin(filePath, parentPath)) {
    throw new Error(message)
  }
}

function isPathWithin(filePath, parentPath) {
  const relativePath = relative(parentPath, filePath)
  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath))
}

function isSafeSkillId(value) {
  return SAFE_SKILL_ID_PATTERN.test(value)
}

function isReviewNode(node) {
  return node.skillId === 'code-review-writer' || node.skillId.includes('review')
}

function sanitizePathPart(value) {
  return String(value).replace(/[^a-z0-9._-]+/gi, '-').replace(/^-|-$/g, '') || 'run'
}

function padNodeOrder(order) {
  return String(order).padStart(3, '0')
}

function parseOptions(args) {
  const parsedOptions = {}

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (!arg.startsWith('--')) {
      continue
    }

    const key = arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
    const nextArg = args[index + 1]

    if (!nextArg || nextArg.startsWith('--')) {
      parsedOptions[key] = true
      continue
    }

    parsedOptions[key] = nextArg
    index += 1
  }

  return parsedOptions
}

function isRecord(value) {
  return typeof value === 'object' && value !== null
}

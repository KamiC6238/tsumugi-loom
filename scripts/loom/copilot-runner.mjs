#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { access, cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { isAbsolute, join, relative, resolve } from 'node:path'

const DEFAULT_PORT = 43117
const DEFAULT_MAX_REVIEW_ROUNDS = 3
const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']
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

function serve(rawOptions) {
  const repoPath = resolve(rawOptions.repo ?? process.cwd())
  const port = Number(rawOptions.port ?? DEFAULT_PORT)
  const dryRun = Boolean(rawOptions.dryRun)
  const dryRunReviewVerdict = rawOptions.dryRunReviewVerdict
  const artifactRoot = resolve(repoPath, rawOptions.artifactRoot ?? 'artifacts/runs')
  const maxReviewRounds = Number(rawOptions.maxReviewRounds ?? DEFAULT_MAX_REVIEW_ROUNDS)
  const allowedOrigins = parseAllowedOrigins(rawOptions.allowedOrigin ?? process.env.TSUMUGI_RUNNER_ALLOWED_ORIGINS)
  const runs = new Map()

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

      if (request.method === 'POST' && request.url === '/runs') {
        const payload = await readRequestJson(request)
        const workflowRun = validateWorkflowRunRequest(payload)
        const runDir = join(artifactRoot, sanitizePathPart(workflowRun.runId))
        const runState = {
          runId: workflowRun.runId,
          status: 'queued',
          artifactDir: relative(repoPath, runDir),
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
          repoPath,
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
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : 'Invalid workflow run request.',
      }, corsHeaders)
    }
  })

  server.listen(port, '127.0.0.1', () => {
    console.log(`Copilot workflow runner listening on http://127.0.0.1:${port}`)
    console.log(`Repository: ${repoPath}`)
    console.log(`Mode: ${dryRun ? 'dry-run' : 'copilot-cli'}`)
    console.log(`Allowed origins: ${Array.from(allowedOrigins).join(', ')}`)
  })
}

async function runOnce(rawOptions) {
  if (!rawOptions.payload) {
    throw new Error('Missing --payload <file> for run command.')
  }

  const repoPath = resolve(rawOptions.repo ?? process.cwd())
  const artifactRoot = resolve(repoPath, rawOptions.artifactRoot ?? 'artifacts/runs')
  const payload = JSON.parse(await readFile(resolve(rawOptions.payload), 'utf8'))
  const workflowRun = validateWorkflowRunRequest(payload)
  const result = await executeWorkflowRun(workflowRun, {
    artifactRoot,
    dryRun: Boolean(rawOptions.dryRun),
    dryRunReviewVerdict: rawOptions.dryRunReviewVerdict,
    maxReviewRounds: Number(rawOptions.maxReviewRounds ?? DEFAULT_MAX_REVIEW_ROUNDS),
    repoPath,
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
  await snapshotSkills(workflowRun.workflow.nodes, options.repoPath, skillSnapshotDir)
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

async function snapshotSkills(nodes, repoPath, skillSnapshotDir) {
  const skillIds = Array.from(new Set(nodes.map((node) => node.skillId)))
  const skillCatalogDir = resolve(repoPath, '.github', 'skills')
  const skillSnapshotRoot = resolve(skillSnapshotDir)

  for (const skillId of skillIds) {
    const sourceDir = resolve(skillCatalogDir, skillId)
    const targetDir = resolve(skillSnapshotRoot, skillId)

    assertPathWithin(sourceDir, skillCatalogDir, `Skill ID is outside the skill catalog: ${skillId}`)
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

  return {
    ...payload,
    runId: payload.runId.trim(),
    workflow: {
      ...payload.workflow,
      id: typeof payload.workflow.id === 'string' ? payload.workflow.id : 'workflow',
      name: typeof payload.workflow.name === 'string' ? payload.workflow.name : 'Workflow',
      nodes,
    },
  }
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

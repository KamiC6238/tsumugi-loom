import { execFile, spawn } from 'node:child_process'
import { access, chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer as createNetServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { afterEach, describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)
const runnerScriptPath = 'scripts/loom/copilot-runner.mjs'

let tempRoot: string | null = null

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true })
    tempRoot = null
  }
})

describe('Copilot runner script dry-run contract', () => {
  it('writes run artifacts, skill snapshots, prompts, and node results without invoking Copilot', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'tsumugi-runner-'))
    const artifactRoot = join(tempRoot, 'artifacts')
    const payloadPath = await writePayload('vitest-runner-contract')

    const { stdout } = await execFileAsync(process.execPath, [
      runnerScriptPath,
      'run',
      '--repo', '.',
      '--artifact-root', artifactRoot,
      '--dry-run',
      '--payload', payloadPath,
    ])
    const result = JSON.parse(stdout) as { runId: string; status: string; artifactDir: string }
    const runDir = join(artifactRoot, 'vitest-runner-contract')

    expect(result).toMatchObject({
      runId: 'vitest-runner-contract',
      status: 'completed',
    })
    expect(result.artifactDir).toBe(runDir)
    await expectJson(join(runDir, 'input', 'issue.json'), { number: 4 })
    await expectJson(join(runDir, 'input', 'workflow.json'), { id: 'workflow-runner' })
    expect(await readFile(join(runDir, 'skills', 'plan-writer', 'SKILL.md'), 'utf8'))
      .toContain('# Plan Writer')

    const planPrompt = await readFile(join(runDir, 'nodes', '001-plan-attempt-1', 'prompt.md'), 'utf8')
    const planResult = await readJson(join(runDir, 'nodes', '001-plan-attempt-1', 'node-result.json'))
    const codingPrompt = await readFile(join(runDir, 'nodes', '002-coding-attempt-1', 'prompt.md'), 'utf8')
    const reviewResult = await readJson(join(runDir, 'nodes', '003-review-attempt-1', 'node-result.json'))

    expect(planPrompt).toContain('This Copilot CLI process is a fresh node session.')
    expect(planPrompt).toContain(join(runDir, 'skills', 'plan-writer', 'SKILL.md'))
    expect(planPrompt).toContain(join(runDir, 'input', 'issue.json'))
    expect(planPrompt).toContain(join(runDir, 'input', 'workflow.json'))
    expect(planPrompt).toContain(join(runDir, 'input', 'request.json'))
    expect(planPrompt).toContain('Previous node artifacts:\n- None')
    expect(planPrompt).toContain(join(runDir, 'nodes', '001-plan-attempt-1', 'node-result.json'))
    expect(planPrompt).toContain('"status": "completed" | "failed"')
    expect(planPrompt).toContain('"verdict": "approved" | "changes_requested" | null')
    expect(codingPrompt).toContain('nodes/001-plan-attempt-1 (plan)')
    expect(planResult).toMatchObject({ status: 'completed', verdict: null })
    expect(reviewResult).toMatchObject({ status: 'completed', verdict: 'approved' })
  })

  it('loops from review back to the previous node when dry-run review asks for changes', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'tsumugi-runner-loop-'))
    const artifactRoot = join(tempRoot, 'artifacts')
    const payloadPath = await writePayload('vitest-runner-loop')

    const { stdout } = await execFileAsync(process.execPath, [
      runnerScriptPath,
      'run',
      '--repo', '.',
      '--artifact-root', artifactRoot,
      '--dry-run',
      '--dry-run-review-verdict', 'changes_requested',
      '--payload', payloadPath,
    ])

    const runDir = join(artifactRoot, 'vitest-runner-loop')
    const firstReviewResult = await readJson(join(runDir, 'nodes', '003-review-attempt-1', 'node-result.json'))
    const secondCodingResult = await readJson(join(runDir, 'nodes', '002-coding-attempt-2', 'node-result.json'))
    const secondReviewResult = await readJson(join(runDir, 'nodes', '003-review-attempt-2', 'node-result.json'))

    expect(firstReviewResult).toMatchObject({ verdict: 'changes_requested' })
    expect(secondCodingResult).toMatchObject({ status: 'completed' })
    expect(secondReviewResult).toMatchObject({ verdict: 'approved' })
    await expect(access(join(runDir, 'nodes', '001-plan-attempt-2'))).rejects.toBeTruthy()
  })

  it('does not pass resume-style session flags to the spawned Copilot CLI process', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'tsumugi-runner-spawn-'))
    const artifactRoot = join(tempRoot, 'artifacts')
    const payloadPath = await writePayload('vitest-runner-spawn', [
      { order: 1, nodeId: 'plan', name: 'Plan', skillId: 'plan-writer' },
    ], [])
    const fakeBinDir = join(tempRoot, 'bin')
    const fakeCopilotPath = join(fakeBinDir, 'copilot')

    await mkdir(fakeBinDir, { recursive: true })
    await writeFile(fakeCopilotPath, `#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')
const argv = process.argv.slice(2)
const logDirIndex = argv.indexOf('--log-dir')
const logDir = logDirIndex >= 0 ? argv[logDirIndex + 1] : process.cwd()
fs.mkdirSync(logDir, { recursive: true })
fs.writeFileSync(path.join(path.dirname(logDir), 'copilot-argv.json'), JSON.stringify(argv))
const promptIndex = argv.indexOf('--prompt')
const prompt = promptIndex >= 0 ? argv[promptIndex + 1] : ''
const resultMatch = prompt.match(/\\n([^\\n]+node-result\\.json)\\n\\nUse this shape:/)
if (resultMatch) {
  fs.writeFileSync(resultMatch[1], JSON.stringify({ status: 'completed', verdict: null, artifacts: [], summary: 'fake copilot completed' }))
}
`)
    await chmod(fakeCopilotPath, 0o755)

    const { stdout } = await execFileAsync(process.execPath, [
      runnerScriptPath,
      'run',
      '--repo', '.',
      '--artifact-root', artifactRoot,
      '--payload', payloadPath,
    ], {
      env: {
        ...process.env,
        COPILOT_CLI_BIN: fakeCopilotPath,
        PATH: `${fakeBinDir}:${process.env.PATH ?? ''}`,
      },
    })
    expect(JSON.parse(stdout)).toMatchObject({ runId: 'vitest-runner-spawn' })
    const argvPath = join(artifactRoot, 'vitest-runner-spawn', 'nodes', '001-plan-attempt-1', 'copilot-argv.json')
    const argv = JSON.parse(await readFile(argvPath, 'utf8')) as string[]

    expect(argv).toContain('--prompt')
    expect(argv).toContain('--output-format')
    expect(argv).not.toContain('--continue')
    expect(argv).not.toContain('--resume')
    expect(argv).not.toContain('--connect')
  })

  it.each([
    {
      caseName: 'missing review verdict',
      nodeResult: { status: 'completed', verdict: null, artifacts: [], summary: 'review forgot verdict' },
      expectedSummary: 'Review node-result.json must include verdict "approved" or "changes_requested".',
    },
    {
      caseName: 'unknown review verdict',
      nodeResult: { status: 'completed', verdict: 'maybe', artifacts: [], summary: 'review wrote invalid verdict' },
      expectedSummary: 'Review node-result.json must include verdict "approved" or "changes_requested".',
    },
    {
      caseName: 'invalid status',
      nodeResult: { status: 'ok', verdict: 'approved', artifacts: [], summary: 'review wrote invalid status' },
      expectedSummary: 'node-result.json status must be "completed" or "failed".',
    },
    {
      caseName: 'missing status',
      nodeResult: { verdict: 'approved', artifacts: [], summary: 'review omitted status' },
      expectedSummary: 'node-result.json status must be "completed" or "failed".',
    },
  ])('fails a review node result with $caseName', async ({ nodeResult, expectedSummary }) => {
    tempRoot = await mkdtemp(join(tmpdir(), 'tsumugi-runner-invalid-review-'))
    const artifactRoot = join(tempRoot, 'artifacts')
    const payloadPath = await writePayload('vitest-invalid-review', [
      { order: 1, nodeId: 'review', name: 'Review', skillId: 'code-review-writer' },
    ], [])
    const fakeBinDir = join(tempRoot, 'bin')
    const fakeCopilotPath = join(fakeBinDir, 'copilot')

    await mkdir(fakeBinDir, { recursive: true })
    await writeFakeCopilot(fakeCopilotPath, nodeResult)

    const { stdout } = await execFileAsync(process.execPath, [
      runnerScriptPath,
      'run',
      '--repo', '.',
      '--artifact-root', artifactRoot,
      '--payload', payloadPath,
    ], {
      env: {
        ...process.env,
        COPILOT_CLI_BIN: fakeCopilotPath,
      },
    })
    const result = JSON.parse(stdout) as { status: string }
    const runDir = join(artifactRoot, 'vitest-invalid-review')
    const manifest = await readJson(join(runDir, 'manifest.json'))
    const normalizedNodeResult = await readJson(join(runDir, 'nodes', '001-review-attempt-1', 'node-result.json'))

    expect(result).toMatchObject({ status: 'failed' })
    expect(manifest).toMatchObject({ status: 'failed', errorMessage: expectedSummary })
    expect(normalizedNodeResult).toMatchObject({ status: 'failed', verdict: null, summary: expectedSummary })
  })

  it('fails when Copilot exits non-zero after writing a completed node result', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'tsumugi-runner-nonzero-'))
    const artifactRoot = join(tempRoot, 'artifacts')
    const payloadPath = await writePayload('vitest-nonzero-completed', [
      { order: 1, nodeId: 'plan', name: 'Plan', skillId: 'plan-writer' },
    ], [])
    const fakeBinDir = join(tempRoot, 'bin')
    const fakeCopilotPath = join(fakeBinDir, 'copilot')

    await mkdir(fakeBinDir, { recursive: true })
    await writeFakeCopilot(
      fakeCopilotPath,
      { status: 'completed', verdict: null, artifacts: ['artifacts/fake.md'], summary: 'fake copilot completed' },
      1,
    )

    const { stdout } = await execFileAsync(process.execPath, [
      runnerScriptPath,
      'run',
      '--repo', '.',
      '--artifact-root', artifactRoot,
      '--payload', payloadPath,
    ], {
      env: {
        ...process.env,
        COPILOT_CLI_BIN: fakeCopilotPath,
      },
    })
    const result = JSON.parse(stdout) as { status: string }
    const runDir = join(artifactRoot, 'vitest-nonzero-completed')
    const manifest = await readJson(join(runDir, 'manifest.json'))
    const normalizedNodeResult = await readJson(join(runDir, 'nodes', '001-plan-attempt-1', 'node-result.json'))

    expect(result).toMatchObject({ status: 'failed' })
    expect(manifest).toMatchObject({ status: 'failed' })
    expect(normalizedNodeResult).toMatchObject({ status: 'failed', verdict: null, artifacts: ['artifacts/fake.md'] })
    expect(String(normalizedNodeResult.summary)).toContain('fake copilot completed')
    expect(String(normalizedNodeResult.summary)).toContain('Copilot CLI exited with code 1.')
  })

  it('rejects skill IDs that escape the skill catalog directory', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'tsumugi-runner-skill-traversal-'))
    const artifactRoot = join(tempRoot, 'artifacts')
    const payloadPath = await writePayload('vitest-skill-traversal', [
      { order: 1, nodeId: 'plan', name: 'Plan', skillId: '../plan-writer' },
    ], [])

    await expect(execFileAsync(process.execPath, [
      runnerScriptPath,
      'run',
      '--repo', '.',
      '--artifact-root', artifactRoot,
      '--dry-run',
      '--payload', payloadPath,
    ])).rejects.toMatchObject({
      stderr: expect.stringContaining('Workflow node plan has invalid skillId.'),
    })
  })

  it('rejects HTTP run requests from origins outside the local allowlist', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'tsumugi-runner-origin-'))
    const artifactRoot = join(tempRoot, 'artifacts')
    const payloadPath = await writePayload('vitest-origin-denied')
    const port = await getOpenPort()
    const serverProcess = spawn(process.execPath, [
      runnerScriptPath,
      'serve',
      '--repo', '.',
      '--artifact-root', artifactRoot,
      '--dry-run',
      '--port', String(port),
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    try {
      await waitForProcessOutput(serverProcess, 'Copilot workflow runner listening')

      const response = await fetch(`http://127.0.0.1:${port}/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.invalid',
        },
        body: await readFile(payloadPath, 'utf8'),
      })

      expect(response.status).toBe(403)
      expect(response.headers.get('access-control-allow-origin')).toBeNull()
      await expect(access(join(artifactRoot, 'vitest-origin-denied'))).rejects.toBeTruthy()
    }
    finally {
      await stopProcess(serverProcess)
    }
  })
})

async function writePayload(
  runId: string,
  nodes = [
    { order: 1, nodeId: 'plan', name: 'Plan', skillId: 'plan-writer' },
    { order: 2, nodeId: 'coding', name: 'Coding', skillId: 'tdd-coding-writer' },
    { order: 3, nodeId: 'review', name: 'Review', skillId: 'code-review-writer' },
  ],
  edges = [
    { id: 'plan-coding', source: 'plan', target: 'coding' },
    { id: 'coding-review', source: 'coding', target: 'review' },
  ],
) {
  if (!tempRoot) {
    throw new Error('Temp root has not been created.')
  }

  const payloadPath = join(tempRoot, `${runId}.json`)

  await writeFile(payloadPath, JSON.stringify({
    runId,
    createdAt: '2026-04-29T12:00:00.000Z',
    issue: {
      id: 21,
      number: 4,
      title: 'Add Copilot runner workflow',
      state: 'open',
      url: 'https://github.com/octo-org/hello-world/issues/4',
      author: 'mona',
      labels: [],
      comments: 0,
      createdAt: '2026-04-28T00:00:00Z',
      updatedAt: '2026-04-29T00:00:00Z',
    },
    workflow: {
      id: 'workflow-runner',
      name: 'Runner Flow',
      nodes,
      edges,
    },
    options: {
      maxReviewRounds: 3,
      freshSessionPerNode: true,
      skillInjection: 'snapshot-skill-directory',
    },
  }))

  return payloadPath
}

async function readJson(filePath: string) {
  return JSON.parse(await readFile(filePath, 'utf8')) as Record<string, unknown>
}

async function expectJson(filePath: string, expected: Record<string, unknown>) {
  await expect(readJson(filePath)).resolves.toMatchObject(expected)
}

async function writeFakeCopilot(fakeCopilotPath: string, nodeResult: Record<string, unknown>, exitCode = 0) {
  await writeFile(fakeCopilotPath, `#!/usr/bin/env node
const fs = require('node:fs')
const argv = process.argv.slice(2)
const promptIndex = argv.indexOf('--prompt')
const prompt = promptIndex >= 0 ? argv[promptIndex + 1] : ''
const resultMatch = prompt.match(/\\n([^\\n]+node-result\\.json)\\n\\nUse this shape:/)
if (resultMatch) {
  fs.writeFileSync(resultMatch[1], JSON.stringify(${JSON.stringify(nodeResult)}))
}
process.exit(${exitCode})
`)
  await chmod(fakeCopilotPath, 0o755)
}

async function getOpenPort() {
  return new Promise<number>((resolvePromise, rejectPromise) => {
    const server = createNetServer()

    server.on('error', rejectPromise)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0

      server.close(() => resolvePromise(port))
    })
  })
}

async function waitForProcessOutput(childProcess: ReturnType<typeof spawn>, expectedText: string) {
  return new Promise<void>((resolvePromise, rejectPromise) => {
    let output = ''
    const timer = setTimeout(() => {
      cleanup()
      rejectPromise(new Error(`Timed out waiting for process output: ${expectedText}\n${output}`))
    }, 5000)
    const onData = (chunk: Buffer) => {
      output += chunk.toString('utf8')

      if (output.includes(expectedText)) {
        cleanup()
        resolvePromise()
      }
    }
    const onExit = (code: number | null) => {
      cleanup()
      rejectPromise(new Error(`Process exited with code ${code} before output: ${expectedText}\n${output}`))
    }
    const cleanup = () => {
      clearTimeout(timer)
      childProcess.stdout.off('data', onData)
      childProcess.stderr.off('data', onData)
      childProcess.off('exit', onExit)
    }

    childProcess.stdout.on('data', onData)
    childProcess.stderr.on('data', onData)
    childProcess.on('exit', onExit)
  })
}

async function stopProcess(childProcess: ReturnType<typeof spawn>) {
  if (childProcess.exitCode !== null) {
    return
  }

  childProcess.kill()
  await new Promise<void>((resolvePromise) => {
    childProcess.once('exit', () => resolvePromise())
  })
}

import { execFile, spawn } from 'node:child_process'
import { access, chmod, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
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

  it('can run against a target repository while snapshotting skills from the platform catalog', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'tsumugi-runner-external-repo-'))
    const targetRepo = join(tempRoot, 'target-repo')
    const platformRepo = join(tempRoot, 'platform-repo')
    const artifactRoot = join(targetRepo, 'artifacts', 'runs')
    const payloadPath = await writePayload(
      'vitest-external-target',
      [
        { order: 1, nodeId: 'plan', name: 'Plan', skillId: 'plan-writer' },
      ],
      [],
      'octo-org/hello-world',
    )

    await mkdir(join(targetRepo, '.git'), { recursive: true })
    await writeFile(join(targetRepo, '.git', 'config'), '[remote "origin"]\n\turl = git@github.com:octo-org/hello-world.git\n')
    await writeSkillCatalog(platformRepo)

    const { stdout } = await execFileAsync(process.execPath, [
      runnerScriptPath,
      'run',
      '--repo', targetRepo,
      '--skill-catalog', join(platformRepo, '.github', 'skills'),
      '--artifact-root', artifactRoot,
      '--dry-run',
      '--payload', payloadPath,
    ])
    const result = JSON.parse(stdout) as { runId: string; status: string; artifactDir: string }
    const runDir = join(artifactRoot, 'vitest-external-target')

    expect(result).toMatchObject({ runId: 'vitest-external-target', status: 'completed' })
    expect(result.artifactDir).toBe(runDir)
    expect(await readFile(join(runDir, 'skills', 'plan-writer', 'SKILL.md'), 'utf8'))
      .toContain('# plan-writer')
    await expect(access(join(targetRepo, '.github', 'skills', 'plan-writer'))).rejects.toBeTruthy()
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

  it('rejects HTTP run requests without a matching target repository identity', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'tsumugi-runner-repo-identity-'))
    const targetRepo = join(tempRoot, 'repo')
    const artifactRoot = join(targetRepo, 'artifacts', 'runs')
    const missingRepositoryPayloadPath = await writePayload('vitest-missing-repository')
    const mismatchedRepositoryPayloadPath = await writePayload(
      'vitest-mismatched-repository',
      undefined,
      undefined,
      'octo-org/other-repo',
    )
    const port = await getOpenPort()

    await mkdir(join(targetRepo, '.git'), { recursive: true })
    await writeFile(join(targetRepo, '.git', 'config'), '[remote "origin"]\n\turl = git@github.com:octo-org/hello-world.git\n')

    const serverProcess = spawn(process.execPath, [
      runnerScriptPath,
      'serve',
      '--repo-root', tempRoot,
      '--artifact-root', artifactRoot,
      '--dry-run',
      '--port', String(port),
    ], { stdio: ['ignore', 'pipe', 'pipe'] })

    try {
      await waitForProcessOutput(serverProcess, 'Copilot workflow runner listening')

      const missingRepositoryResponse = await fetch(`http://127.0.0.1:${port}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: await readFile(missingRepositoryPayloadPath, 'utf8'),
      })

      expect(missingRepositoryResponse.status).toBe(400)
      expect(await missingRepositoryResponse.json()).toMatchObject({
        message: 'Workflow run request requires repository.fullName.',
      })

      const unresolvedRepositorySelectionResponse = await selectRunnerRepository(port, 'octo-org/missing-repo')

      expect(unresolvedRepositorySelectionResponse.status).toBe(409)
      expect(await unresolvedRepositorySelectionResponse.json()).toMatchObject({
        message: 'Selected repository could not be resolved on this machine: octo-org/missing-repo',
      })

      const selectedRepositoryResponse = await selectRunnerRepository(port)

      expect(selectedRepositoryResponse.status).toBe(200)
      expect(await selectedRepositoryResponse.json()).toMatchObject({
        repoPath: targetRepo,
        repositoryFullName: 'octo-org/hello-world',
        capabilities: { repositorySelection: true },
      })

      const mismatchedRepositoryResponse = await fetch(`http://127.0.0.1:${port}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: await readFile(mismatchedRepositoryPayloadPath, 'utf8'),
      })

      expect(mismatchedRepositoryResponse.status).toBe(409)
      expect(await mismatchedRepositoryResponse.json()).toMatchObject({
        message: 'Runner current repository does not match the requested repository.',
      })
      await expect(access(join(artifactRoot, 'vitest-missing-repository'))).rejects.toBeTruthy()
      await expect(access(join(artifactRoot, 'vitest-mismatched-repository'))).rejects.toBeTruthy()
    }
    finally {
      await stopProcess(serverProcess)
    }
  })

  it('runs HTTP workflow requests inside the pushed current repository', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'tsumugi-runner-http-selected-repo-'))
    const targetRepo = join(tempRoot, 'repo')
    const artifactRoot = join(targetRepo, 'artifacts', 'runs')
    const fakeBinDir = join(tempRoot, 'bin')
    const fakeCopilotPath = join(fakeBinDir, 'copilot')
    const payloadPath = await writePayload(
      'vitest-http-selected-run',
      [{ order: 1, nodeId: 'plan', name: 'Plan', skillId: 'plan-writer' }],
      [],
      'octo-org/hello-world',
    )
    const port = await getOpenPort()

    await mkdir(join(targetRepo, '.git'), { recursive: true })
    await writeFile(join(targetRepo, '.git', 'config'), '[remote "origin"]\n\turl = git@github.com:octo-org/hello-world.git\n')
    await mkdir(fakeBinDir, { recursive: true })
    await writeFile(fakeCopilotPath, `#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')
const argv = process.argv.slice(2)
const logDirIndex = argv.indexOf('--log-dir')
const logDir = logDirIndex >= 0 ? argv[logDirIndex + 1] : process.cwd()
fs.mkdirSync(logDir, { recursive: true })
fs.writeFileSync(path.join(path.dirname(logDir), 'copilot-cwd.json'), JSON.stringify({ cwd: process.cwd(), argv }))
const promptIndex = argv.indexOf('--prompt')
const prompt = promptIndex >= 0 ? argv[promptIndex + 1] : ''
const resultMatch = prompt.match(/\\n([^\\n]+node-result\\.json)\\n\\nUse this shape:/)
if (resultMatch) {
  fs.writeFileSync(resultMatch[1], JSON.stringify({ status: 'completed', verdict: null, artifacts: [], summary: 'fake copilot completed' }))
}
`)
    await chmod(fakeCopilotPath, 0o755)

    const serverProcess = spawn(process.execPath, [
      runnerScriptPath,
      'serve',
      '--repo-root', tempRoot,
      '--artifact-root', artifactRoot,
      '--port', String(port),
    ], {
      env: {
        ...process.env,
        COPILOT_CLI_BIN: fakeCopilotPath,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    try {
      await waitForProcessOutput(serverProcess, 'Copilot workflow runner listening')

      const selectionResponse = await selectRunnerRepository(port)

      expect(selectionResponse.status).toBe(200)

      const runResponse = await fetch(`http://127.0.0.1:${port}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: await readFile(payloadPath, 'utf8'),
      })

      expect(runResponse.status).toBe(202)
      expect(await runResponse.json()).toMatchObject({
        runId: 'vitest-http-selected-run',
        status: 'queued',
        artifactDir: 'artifacts/runs/vitest-http-selected-run',
      })

      const manifest = await waitForRunManifestStatus(
        join(artifactRoot, 'vitest-http-selected-run', 'manifest.json'),
        'completed',
      )

      expect(manifest).toMatchObject({
        runId: 'vitest-http-selected-run',
        status: 'completed',
      })

      const copilotInvocation = await readJson(join(
        artifactRoot,
        'vitest-http-selected-run',
        'nodes',
        '001-plan-attempt-1',
        'copilot-cwd.json',
      ))
      const targetRepoRealPath = await realpath(targetRepo)

      expect(copilotInvocation).toMatchObject({
        cwd: targetRepoRealPath,
        argv: expect.arrayContaining(['--add-dir', targetRepo]),
      })
      expect(copilotInvocation).toMatchObject({
        argv: expect.arrayContaining(['--add-dir', join(artifactRoot, 'vitest-http-selected-run')]),
      })
    }
    finally {
      await stopProcess(serverProcess)
    }
  })

  it('creates and updates the target repository Knowledge Base from a completed run artifact', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'tsumugi-runner-kb-'))
    const targetRepo = join(tempRoot, 'repo')
    const artifactRoot = join(targetRepo, 'artifacts', 'runs')
    const payloadPath = await writePayload('vitest-kb-update')

    await mkdir(join(targetRepo, '.git'), { recursive: true })
    await writeSkillCatalog(targetRepo)
    await writeFile(join(targetRepo, '.git', 'config'), [
      '[remote "origin"]',
      '\turl = git@github.com:octo-org/hello-world.git',
      '',
    ].join('\n'))
    await mkdir(join(targetRepo, 'artifacts'), { recursive: true })
    await execFileAsync(process.execPath, [
      runnerScriptPath,
      'run',
      '--repo', targetRepo,
      '--artifact-root', artifactRoot,
      '--dry-run',
      '--payload', payloadPath,
    ])
    await writeFile(join(artifactRoot, 'vitest-kb-update', 'nodes', '001-plan-attempt-1', 'plan.md'), [
      '# Plan',
      '',
      '- Checkout approvals require reviewer assignment before fulfillment.',
      '- Orders without approvers must remain pending.',
      '',
    ].join('\n'))
    await writeFile(join(artifactRoot, 'vitest-kb-update', 'nodes', '001-plan-attempt-1', 'node-result.json'), JSON.stringify({
      status: 'completed',
      verdict: null,
      artifacts: ['artifacts/runs/vitest-kb-update/nodes/001-plan-attempt-1/plan.md'],
      summary: 'Planned checkout approval workflow.',
    }))
    await mkdir(join(targetRepo, 'docs'), { recursive: true })
    await writeFile(join(targetRepo, 'docs', 'knowledge-base.md'), [
      '# Knowledge Base',
      '',
      'Hand-written project note.',
      '',
    ].join('\n'))

    const port = await getOpenPort()
    const serverProcess = spawn(process.execPath, [
      runnerScriptPath,
      'serve',
      '--repo-root', tempRoot,
      '--artifact-root', artifactRoot,
      '--dry-run',
      '--port', String(port),
    ], { stdio: ['ignore', 'pipe', 'pipe'] })

    try {
      await waitForProcessOutput(serverProcess, 'Copilot workflow runner listening')

      const emptyStatusResponse = await fetch(`http://127.0.0.1:${port}/status`)

      expect(await emptyStatusResponse.json()).toMatchObject({
        repositoryFullName: null,
        capabilities: { repositorySelection: true },
      })

      const selectionResponse = await selectRunnerRepository(port)

      expect(selectionResponse.status).toBe(200)
      expect(await selectionResponse.json()).toMatchObject({
        repoPath: targetRepo,
        repositoryFullName: 'octo-org/hello-world',
        capabilities: { knowledgeBaseUpdates: true, repositorySelection: true },
      })

      const statusResponse = await fetch(`http://127.0.0.1:${port}/status`)

      expect(await statusResponse.json()).toMatchObject({
        repositoryFullName: 'octo-org/hello-world',
        capabilities: { knowledgeBaseUpdates: true, repositorySelection: true },
      })

      for (let index = 0; index < 2; index += 1) {
        const response = await fetch(`http://127.0.0.1:${port}/runs/vitest-kb-update/knowledge-base`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId: 'vitest-kb-update',
            repository: { fullName: 'octo-org/hello-world' },
            target: { path: 'docs/knowledge-base.md' },
          }),
        })

        expect(response.status).toBe(200)
        expect(await response.json()).toMatchObject({
          runId: 'vitest-kb-update',
          status: 'updated',
          targetPath: 'docs/knowledge-base.md',
          factCount: expect.any(Number),
          updateArtifact: 'artifacts/runs/vitest-kb-update/knowledge-base/update.json',
        })
      }

      const knowledgeBase = await readFile(join(targetRepo, 'docs', 'knowledge-base.md'), 'utf8')

      expect(knowledgeBase).toContain('Issue #4: Add Copilot runner workflow')
      expect(knowledgeBase).toContain('Checkout approvals require reviewer assignment before fulfillment.')
      expect(knowledgeBase).toContain('Hand-written project note')
      expect(knowledgeBase.match(/<!-- tsumugi-loom:entry:start runId=vitest-kb-update -->/g)).toHaveLength(1)
      expect(knowledgeBase.match(/Checkout approvals require reviewer assignment before fulfillment\./g)).toHaveLength(1)
      await expectJson(join(artifactRoot, 'vitest-kb-update', 'knowledge-base', 'update.json'), {
        runId: 'vitest-kb-update',
        targetPath: 'docs/knowledge-base.md',
      })

      await writeFile(join(targetRepo, 'docs', 'knowledge-base.md'), [
        '# Knowledge Base',
        '',
        '<!-- tsumugi-loom:knowledge-base:start -->',
        'broken managed section',
        '',
      ].join('\n'))

      const malformedResponse = await fetch(`http://127.0.0.1:${port}/runs/vitest-kb-update/knowledge-base`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId: 'vitest-kb-update',
          repository: { fullName: 'octo-org/hello-world' },
          target: { path: 'docs/knowledge-base.md' },
        }),
      })

      expect(malformedResponse.status).toBe(409)
      expect(await malformedResponse.json()).toMatchObject({
        message: 'Knowledge Base managed section markers are malformed.',
      })

      await writeFile(join(targetRepo, 'docs', 'knowledge-base.md'), [
        '# Knowledge Base',
        '',
        '<!-- tsumugi-loom:knowledge-base:end -->',
        'reversed managed section',
        '<!-- tsumugi-loom:knowledge-base:start -->',
        '',
      ].join('\n'))

      const reversedMarkerResponse = await fetch(`http://127.0.0.1:${port}/runs/vitest-kb-update/knowledge-base`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId: 'vitest-kb-update',
          repository: { fullName: 'octo-org/hello-world' },
          target: { path: 'docs/knowledge-base.md' },
        }),
      })

      expect(reversedMarkerResponse.status).toBe(409)
      expect(await reversedMarkerResponse.json()).toMatchObject({
        message: 'Knowledge Base managed section markers are malformed.',
      })
    }
    finally {
      await stopProcess(serverProcess)
    }
  })

  it('rejects Knowledge Base updates for non-completed runs and mismatched repositories', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'tsumugi-runner-kb-reject-'))
    const targetRepo = join(tempRoot, 'repo')
    const artifactRoot = join(targetRepo, 'artifacts', 'runs')
    const runDir = join(artifactRoot, 'queued-run')

    await mkdir(join(targetRepo, '.git'), { recursive: true })
    await writeFile(join(targetRepo, '.git', 'config'), '[remote "origin"]\n\turl = git@github.com:octo-org/hello-world.git\n')
    await mkdir(runDir, { recursive: true })
    await writeFile(join(runDir, 'manifest.json'), JSON.stringify({
      runId: 'queued-run',
      issueNumber: 4,
      workflowId: 'workflow-runner',
      status: 'running',
      updatedAt: '2026-04-30T00:00:00.000Z',
    }))

    const port = await getOpenPort()
    const serverProcess = spawn(process.execPath, [
      runnerScriptPath,
      'serve',
      '--repo-root', tempRoot,
      '--artifact-root', artifactRoot,
      '--dry-run',
      '--port', String(port),
    ], { stdio: ['ignore', 'pipe', 'pipe'] })

    try {
      await waitForProcessOutput(serverProcess, 'Copilot workflow runner listening')

      const selectionResponse = await selectRunnerRepository(port)

      expect(selectionResponse.status).toBe(200)

      const queuedResponse = await fetch(`http://127.0.0.1:${port}/runs/queued-run/knowledge-base`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: 'queued-run', repository: { fullName: 'octo-org/hello-world' } }),
      })

      expect(queuedResponse.status).toBe(409)
      expect(await queuedResponse.json()).toMatchObject({
        message: 'Workflow run must be completed before updating the Knowledge Base.',
      })

      const invalidPathResponse = await fetch(`http://127.0.0.1:${port}/runs/queued-run/knowledge-base`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId: 'queued-run',
          repository: { fullName: 'octo-org/hello-world' },
          target: { path: '../knowledge-base.md' },
        }),
      })

      expect(invalidPathResponse.status).toBe(400)
      expect(await invalidPathResponse.json()).toMatchObject({
        message: 'Knowledge Base target path is not supported.',
      })

      await writeFile(join(runDir, 'manifest.json'), JSON.stringify({
        runId: 'queued-run',
        issueNumber: 4,
        workflowId: 'workflow-runner',
        status: 'completed',
        updatedAt: '2026-04-30T00:00:00.000Z',
      }))

      await writeFile(join(runDir, 'manifest.json'), JSON.stringify({
        runId: 'different-run',
        issueNumber: 4,
        workflowId: 'workflow-runner',
        status: 'completed',
        updatedAt: '2026-04-30T00:00:00.000Z',
      }))

      const mismatchedManifestResponse = await fetch(`http://127.0.0.1:${port}/runs/queued-run/knowledge-base`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: 'queued-run', repository: { fullName: 'octo-org/hello-world' } }),
      })

      expect(mismatchedManifestResponse.status).toBe(409)
      expect(await mismatchedManifestResponse.json()).toMatchObject({
        message: 'Workflow run manifest does not match the requested run id.',
      })

      await writeFile(join(runDir, 'manifest.json'), JSON.stringify({
        runId: 'queued-run',
        issueNumber: 4,
        workflowId: 'workflow-runner',
        status: 'completed',
        updatedAt: '2026-04-30T00:00:00.000Z',
      }))

      const missingRepositoryResponse = await fetch(`http://127.0.0.1:${port}/runs/queued-run/knowledge-base`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: 'queued-run' }),
      })

      expect(missingRepositoryResponse.status).toBe(400)
      expect(await missingRepositoryResponse.json()).toMatchObject({
        message: 'Knowledge Base update requires repository.fullName.',
      })

      const mismatchResponse = await fetch(`http://127.0.0.1:${port}/runs/queued-run/knowledge-base`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: 'queued-run', repository: { fullName: 'octo-org/other-repo' } }),
      })

      expect(mismatchResponse.status).toBe(409)
      expect(await mismatchResponse.json()).toMatchObject({
        message: 'Runner current repository does not match the requested repository.',
      })
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
  repositoryFullName: string | null = null,
) {
  if (!tempRoot) {
    throw new Error('Temp root has not been created.')
  }

  const payloadPath = join(tempRoot, `${runId}.json`)

  const [owner = '', name = ''] = repositoryFullName?.split('/') ?? []

  await writeFile(payloadPath, JSON.stringify({
    runId,
    createdAt: '2026-04-29T12:00:00.000Z',
    ...(repositoryFullName
      ? {
          repository: {
            owner,
            name,
            fullName: repositoryFullName,
          },
        }
      : {}),
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

async function waitForJsonFile(filePath: string) {
  let lastError: unknown = null

  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      return await readJson(filePath)
    }
    catch (error) {
      lastError = error
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 20))
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`JSON file was not written: ${filePath}`)
}

async function waitForRunManifestStatus(filePath: string, status: string) {
  let manifest: Record<string, unknown> | null = null

  for (let attempt = 0; attempt < 50; attempt += 1) {
    manifest = await waitForJsonFile(filePath)

    if (manifest.status === status) {
      return manifest
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 20))
  }

  return manifest ?? await waitForJsonFile(filePath)
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

async function writeSkillCatalog(repoPath: string) {
  for (const skillId of ['plan-writer', 'tdd-coding-writer', 'code-review-writer']) {
    const skillDir = join(repoPath, '.github', 'skills', skillId)

    await mkdir(skillDir, { recursive: true })
    await writeFile(join(skillDir, 'SKILL.md'), `# ${skillId}\n`)
  }
}

async function selectRunnerRepository(port: number, repositoryFullName = 'octo-org/hello-world') {
  const [owner = '', name = ''] = repositoryFullName.split('/')

  return fetch(`http://127.0.0.1:${port}/repository`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repository: {
        owner,
        name,
        fullName: repositoryFullName,
      },
    }),
  })
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

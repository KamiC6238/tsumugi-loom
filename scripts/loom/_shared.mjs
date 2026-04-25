import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))

export const repoRoot = path.resolve(scriptDirectory, '../..')
export const workflowsRoot = path.join(repoRoot, 'artifacts', 'workflows')
export const generatedKnowledgeRoot = path.join(repoRoot, 'docs', 'generated', 'run-knowledge')
export const decisionsRoot = path.join(repoRoot, 'docs', 'decisions')

export const requiredWorkflowFiles = [
  'manifest.json',
  'plan.md',
  'plan.json',
  'clarification.md',
  'code-change.md',
  'test-report.md',
  'review.md',
  'final-summary.md',
  'knowledge-delta.json',
]

export const codingStageArtifactFiles = ['tdd-cycle.md', 'test-review.md']

export const markdownArtifactFiles = requiredWorkflowFiles.filter((fileName) =>
  fileName.endsWith('.md'),
)

export const codingStageMarkdownArtifactFiles = codingStageArtifactFiles.filter((fileName) =>
  fileName.endsWith('.md'),
)

export function parseArgs(argv) {
  const positional = []
  const flags = {}

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]

    if (token === '--') {
      continue
    }

    if (!token.startsWith('--')) {
      positional.push(token)
      continue
    }

    const [rawKey, inlineValue] = token.slice(2).split('=')

    if (inlineValue !== undefined) {
      flags[rawKey] = inlineValue
      continue
    }

    const nextToken = argv[index + 1]

    if (nextToken && !nextToken.startsWith('--')) {
      flags[rawKey] = nextToken
      index += 1
      continue
    }

    flags[rawKey] = true
  }

  return { positional, flags }
}

export function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'workflow'
}

function pad(value) {
  return String(value).padStart(2, '0')
}

export function createWorkflowId(rawSlug, date = new Date()) {
  const slug = slugify(rawSlug)
  const year = String(date.getFullYear())
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())

  return `${year}${month}${day}-${hours}${minutes}${seconds}-${slug}`
}

export function getWorkflowPath(workflowId) {
  return path.join(workflowsRoot, workflowId)
}

export function toRelativePath(targetPath) {
  return path.relative(repoRoot, targetPath).split(path.sep).join('/')
}

export async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true })
}

export async function exists(targetPath) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

export async function writeTextFile(filePath, content, { overwrite = false } = {}) {
  await ensureDirectory(path.dirname(filePath))

  if (!overwrite && (await exists(filePath))) {
    throw new Error(`Refusing to overwrite existing file: ${toRelativePath(filePath)}`)
  }

  await fs.writeFile(filePath, content, 'utf8')
}

export async function writeJsonFile(filePath, data, options = {}) {
  await writeTextFile(filePath, `${JSON.stringify(data, null, 2)}\n`, options)
}

export async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

export const canonicalWorkflowNodeIds = [
  'plan',
  'coding',
  'test',
  'review',
  'docs-reconciler',
]

export function buildKnowledgeDeltaTemplate(workflowId, createdAt) {
  return {
    sourceWorkflowId: workflowId,
    sourceNodeIds: [...canonicalWorkflowNodeIds],
    timestamp: createdAt,
    candidateFacts: [],
    affectedAreas: [],
    confidence: 'medium',
    evidence: [
      `artifacts/workflows/${workflowId}/plan.md`,
      `artifacts/workflows/${workflowId}/plan.json`,
      `artifacts/workflows/${workflowId}/clarification.md`,
      `artifacts/workflows/${workflowId}/tdd-cycle.md`,
      `artifacts/workflows/${workflowId}/test-review.md`,
      `artifacts/workflows/${workflowId}/code-change.md`,
      `artifacts/workflows/${workflowId}/test-report.md`,
      `artifacts/workflows/${workflowId}/review.md`,
      `artifacts/workflows/${workflowId}/final-summary.md`,
    ],
    recommendedTargets: [],
    reviewRequired: true,
  }
}
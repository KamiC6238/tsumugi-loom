import path from 'node:path'
import {
  ensureDirectory,
  generatedKnowledgeRoot,
  parseArgs,
  toRelativePath,
  writeJsonFile,
  writeTextFile,
} from './_shared.mjs'
import {
  applyCanonicalDocUpdates,
  renderReconciliationReport,
  renderRunKnowledge,
  summarizeValidation,
  validateWorkflow,
} from './workflow.mjs'

function printUsage() {
  console.error('Usage: pnpm loom:workflow:reconcile -- <workflow-id>')
}

const { positional } = parseArgs(process.argv.slice(2))
const workflowId = positional[0]

if (!workflowId) {
  printUsage()
  process.exit(1)
}

const result = await validateWorkflow(workflowId)

if (result.issues.length > 0) {
  console.error(summarizeValidation(result))
  process.exit(1)
}

await ensureDirectory(generatedKnowledgeRoot)

const canonicalDocUpdates = await applyCanonicalDocUpdates(result)
const appliedTargets = canonicalDocUpdates
  .filter((update) => update.status === 'applied')
  .map((update) => update.target)
const ingestedTargets = canonicalDocUpdates
  .filter(
    (update) =>
      (update.status === 'applied' || update.status === 'already_present') &&
      update.target !== 'docs/generated/run-knowledge/',
  )
  .map((update) => update.target)

const generatedKnowledgePath = path.join(generatedKnowledgeRoot, `${workflowId}.md`)
const reconciliationPath = path.join(result.workflowPath, 'reconciliation.md')

await writeTextFile(generatedKnowledgePath, renderRunKnowledge(result, canonicalDocUpdates), {
  overwrite: true,
})
await writeTextFile(
  reconciliationPath,
  renderReconciliationReport(result, toRelativePath(generatedKnowledgePath), canonicalDocUpdates),
  { overwrite: true },
)

const completedAt = new Date().toISOString()

const updatedManifest = {
  ...result.manifest,
  status: 'knowledge_base_updated',
  reconciledAt: completedAt,
  knowledgeBaseUpdatedAt:
    appliedTargets.length > 0
      ? completedAt
      : result.manifest.knowledgeBaseUpdatedAt || result.manifest.reconciledAt || completedAt,
  generatedRunKnowledge: toRelativePath(generatedKnowledgePath),
  reconciliationReport: toRelativePath(reconciliationPath),
  updatedCanonicalDocs: Array.from(
    new Set(
      [...(result.manifest.updatedCanonicalDocs || []), ...ingestedTargets],
    ),
  ),
}

await writeJsonFile(path.join(result.workflowPath, 'manifest.json'), updatedManifest, {
  overwrite: true,
})

console.log(`Generated run knowledge: ${toRelativePath(generatedKnowledgePath)}`)
console.log(`Generated reconciliation report: ${toRelativePath(reconciliationPath)}`)

if (appliedTargets.length === 0) {
  console.log('No new canonical doc updates were applied.')
} else {
  console.log(`Updated canonical docs: ${Array.from(new Set(appliedTargets)).join(', ')}`)
}
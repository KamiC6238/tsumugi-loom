import { parseArgs, toRelativePath } from './_shared.mjs'
import { createWorkflowScaffold } from './workflow.mjs'

function printUsage() {
  console.error('Usage: pnpm loom:workflow:start -- <slug> [--goal "..."]')
}

const { positional, flags } = parseArgs(process.argv.slice(2))
const slug = positional[0]

if (!slug) {
  printUsage()
  process.exit(1)
}

try {
  const { workflowId, workflowPath } = await createWorkflowScaffold({
    slug,
    goal: typeof flags.goal === 'string' ? flags.goal : '',
  })

  console.log(`Created workflow: ${workflowId}`)
  console.log(`Path: ${toRelativePath(workflowPath)}`)
  console.log('Next steps:')
  console.log(`1. Fill artifacts in ${toRelativePath(workflowPath)}`)
  console.log(`2. Run: pnpm loom:workflow:validate -- ${workflowId}`)
  console.log(`3. Run: pnpm loom:workflow:reconcile -- ${workflowId}`)
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
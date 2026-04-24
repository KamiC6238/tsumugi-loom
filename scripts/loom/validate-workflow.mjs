import { parseArgs } from './_shared.mjs'
import { summarizeValidation, validateWorkflow } from './workflow.mjs'

function printUsage() {
  console.error('Usage: pnpm loom:workflow:validate -- <workflow-id>')
}

const { positional } = parseArgs(process.argv.slice(2))
const workflowId = positional[0]

if (!workflowId) {
  printUsage()
  process.exit(1)
}

const result = await validateWorkflow(workflowId)
console.log(summarizeValidation(result))

if (result.issues.length > 0) {
  process.exit(1)
}
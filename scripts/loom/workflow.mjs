import fs from 'node:fs/promises'
import path from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'
import {
  buildKnowledgeDeltaTemplate,
  codingStageArtifactFiles,
  codingStageMarkdownArtifactFiles,
  createWorkflowId,
  decisionsRoot,
  exists,
  getWorkflowPath,
  markdownArtifactFiles,
  readJsonFile,
  requiredWorkflowFiles,
  repoRoot,
  slugify,
  toRelativePath,
  writeJsonFile,
  writeTextFile,
} from './_shared.mjs'

const sourceDesignDocs = [
  'TSUMUGI_LOOM_DISCUSSION_SUMMARY.zh-CN.md',
  'TSUMUGI_LOOM_KNOWLEDGE_BASE_PROPOSAL.zh-CN.md',
]

const canonicalDocs = [
  'ARCHITECTURE.md',
  'docs/CONVENTIONS.md',
  'docs/DOMAIN.md',
  'docs/decisions/',
  'docs/generated/run-knowledge/',
]

const canonicalKnowledgeSections = {
  'ARCHITECTURE.md': {
    title: '## 7. Workflow-verified Facts',
    marker: 'ARCHITECTURE',
  },
  'docs/CONVENTIONS.md': {
    title: '## 6. Workflow-verified Rules',
    marker: 'CONVENTIONS',
  },
  'docs/DOMAIN.md': {
    title: '## 5. Workflow-verified Domain Notes',
    marker: 'DOMAIN',
  },
}

const planTemplatePath = path.join(
  repoRoot,
  '.github',
  'skills',
  'plan-writer',
  'assets',
  'plan-artifact-template.md',
)

const planJsonTemplatePath = path.join(
  repoRoot,
  '.github',
  'skills',
  'plan-writer',
  'assets',
  'plan-artifact-template.json',
)

const clarificationTemplatePath = path.join(
  repoRoot,
  '.github',
  'skills',
  'plan-writer',
  'assets',
  'clarification-artifact-template.md',
)

const tddCycleTemplatePath = path.join(
  repoRoot,
  '.github',
  'skills',
  'tdd-coding-writer',
  'assets',
  'tdd-cycle-template.md',
)

const testReviewTemplatePath = path.join(
  repoRoot,
  '.github',
  'skills',
  'tdd-coding-writer',
  'assets',
  'test-review-template.md',
)

const reviewTemplatePath = path.join(
  repoRoot,
  '.github',
  'skills',
  'code-review-writer',
  'assets',
  'review-template.md',
)

const planJsonSchemaPath = path.join(repoRoot, 'docs', 'process', 'plan-artifact.schema.json')

const requiredPlanSections = [
  '## Source User Request',
  '## Problem',
  '## Scope',
  '## Out of Scope',
  '## Constraints',
  '## Assumptions',
  '## Open Questions',
  '## Task Breakdown',
  '## Acceptance Criteria',
  '## Test Strategy',
  '## Docs Impact',
  '## Relevant Knowledge Base Slices',
  '## Handoff Notes for Coding',
]

const requiredClarificationSections = [
  '## Decision',
  '## Blocking Questions',
  '## Next Action',
  '## Resolution Notes',
]

const requiredReviewSections = [
  '## Scope Reviewed',
  '## Findings',
  '## Risks and Regressions',
  '## Required Rework',
  '## Resolution Notes',
]

const ajv = new Ajv2020({ allErrors: true, strict: false })
let planJsonValidatorPromise

async function renderPlanArtifact({ workflowId, goal }) {
  const template = await fs.readFile(planTemplatePath, 'utf8')

  return template
    .replaceAll('{{WORKFLOW_ID}}', workflowId)
    .replaceAll('{{GOAL}}', goal || 'TODO: 补充本次开发回合的目标')
}

async function renderPlanJsonArtifact({ workflowId, goal }) {
  const template = await fs.readFile(planJsonTemplatePath, 'utf8')
  const raw = template
    .replaceAll('{{WORKFLOW_ID}}', workflowId)
    .replaceAll('{{GOAL}}', goal || 'TODO: 补充本次开发回合的目标')

  return JSON.parse(raw)
}

async function renderClarificationArtifact({ workflowId }) {
  const template = await fs.readFile(clarificationTemplatePath, 'utf8')

  return template.replaceAll('{{WORKFLOW_ID}}', workflowId)
}

async function renderWorkflowTemplate(templatePath, replacements) {
  let template = await fs.readFile(templatePath, 'utf8')

  for (const [key, value] of Object.entries(replacements)) {
    template = template.replaceAll(`{{${key}}}`, value)
  }

  return template
}

function renderCodeChangeArtifact(workflowId) {
  return `# Code Change Artifact

Workflow ID: ${workflowId}

## Files Changed

TODO: 列出修改文件和原因。

## Behavioral Changes

TODO: 描述行为变化。

## Implementation Notes

TODO: 记录关键实现取舍。

## Follow-up Risks

TODO: 记录仍需关注的问题。
`
}

function renderTestReportArtifact(workflowId) {
  return `# Test Report Artifact

Workflow ID: ${workflowId}

## Commands Run

TODO: 记录执行过的验证命令。

## Results

TODO: 记录通过或失败结果。

## Coverage Gaps

TODO: 记录未覆盖的验证空白。
`
}

function renderFinalSummaryArtifact(workflowId) {
  return `# Final Summary Artifact

Workflow ID: ${workflowId}

## Outcome

TODO: 总结本次产出。

## User-visible Impact

TODO: 描述用户可感知变化。

## Recommended Next Steps

TODO: 记录自然下一步。
`
}

function ensureManagedKnowledgeSection(content, config) {
  const startMarker = `<!-- BEGIN AUTO-KB:${config.marker} -->`
  const endMarker = `<!-- END AUTO-KB:${config.marker} -->`

  if (content.includes(startMarker) && content.includes(endMarker)) {
    return { content, startMarker, endMarker }
  }

  const appended = `${content.trimEnd()}\n\n${config.title}\n\n${startMarker}\n${endMarker}\n`

  return { content: appended, startMarker, endMarker }
}

function renderCanonicalKnowledgeEntry(candidateFact, workflowId) {
  const supportingArtifacts = Array.isArray(candidateFact.supportingArtifacts)
    ? candidateFact.supportingArtifacts.map((artifact) => `    - ${artifact}`).join('\n')
    : '    - 无'

  return `- ${candidateFact.fact}\n  - workflow: ${workflowId}\n  - freshness: ${candidateFact.freshness}\n  - rationale: ${candidateFact.rationale}\n  - supportingArtifacts:\n${supportingArtifacts}`
}

function upsertCanonicalKnowledgeEntry(content, config, candidateFact, workflowId) {
  const { content: sectionReadyContent, startMarker, endMarker } = ensureManagedKnowledgeSection(
    content,
    config,
  )

  const factLine = `- ${candidateFact.fact}`

  if (sectionReadyContent.includes(factLine)) {
    return { content: sectionReadyContent, status: 'already_present' }
  }

  const entry = renderCanonicalKnowledgeEntry(candidateFact, workflowId)
  const replacement = `${startMarker}\n${entry}\n${endMarker}`

  return {
    content: sectionReadyContent.replace(`${startMarker}\n${endMarker}`, replacement),
    status: 'applied',
  }
}

function renderDecisionRecord(candidateFact, workflowId) {
  const supportingArtifacts = Array.isArray(candidateFact.supportingArtifacts)
    ? candidateFact.supportingArtifacts.map((artifact) => `1. ${artifact}`).join('\n')
    : '1. 无'

  return `# Auto Decision Record\n\nWorkflow ID: ${workflowId}\n\n## Background\n\n本决策记录由 Docs Reconciler 根据本轮 workflow 的 knowledge delta 自动生成，用于沉淀跨 workflow 的稳定取舍。\n\n## Problem\n\n需要把已经验证的事实沉淀到 canonical knowledge base，而不是只停留在 generated run knowledge。\n\n## Decision\n\n${candidateFact.fact}\n\n## Rationale\n\n${candidateFact.rationale}\n\n## Supporting Artifacts\n\n${supportingArtifacts}\n\n## Freshness\n\n${candidateFact.freshness}\n\n## Follow-up\n\n1. 如果后续 workflow 发现该结论不再成立，应显式更新或废弃这份记录。\n`
}

export async function createWorkflowScaffold({ slug, goal }) {
  const now = new Date()
  const workflowId = createWorkflowId(slug, now)
  const createdAt = now.toISOString()
  const workflowPath = getWorkflowPath(workflowId)

  const manifest = {
    workflowId,
    slug,
    goal: goal || '',
    status: 'in_progress',
    createdAt,
    planSchema: 'docs/process/PLAN_ARTIFACT_SCHEMA.zh-CN.md',
    planJsonSchema: 'docs/process/plan-artifact.schema.json',
    clarificationGuide: 'docs/process/CLARIFICATION_ARTIFACT.zh-CN.md',
    planningSkill: '.github/skills/plan-writer/SKILL.md',
    codingGuide: 'docs/process/TDD_CODING_WORKFLOW.zh-CN.md',
    reviewGuide: 'docs/process/CODE_REVIEW_WORKFLOW.zh-CN.md',
    codingSkill: '.github/skills/tdd-coding-writer/SKILL.md',
    reviewSkill: '.github/skills/code-review-writer/SKILL.md',
    testReviewerAgent: '.github/agents/test-case-reviewer.agent.md',
    codeReviewerAgent: '.github/agents/code-reviewer.agent.md',
    sourceDesignDocs,
    canonicalDocs,
    artifactFiles: [...requiredWorkflowFiles, ...codingStageArtifactFiles],
  }

  await writeJsonFile(path.join(workflowPath, 'manifest.json'), manifest)
  await writeTextFile(path.join(workflowPath, 'plan.md'), await renderPlanArtifact({ workflowId, goal }))
  await writeJsonFile(
    path.join(workflowPath, 'plan.json'),
    await renderPlanJsonArtifact({ workflowId, goal }),
  )
  await writeTextFile(
    path.join(workflowPath, 'clarification.md'),
    await renderClarificationArtifact({ workflowId }),
  )
  await writeTextFile(
    path.join(workflowPath, 'tdd-cycle.md'),
    await renderWorkflowTemplate(tddCycleTemplatePath, { WORKFLOW_ID: workflowId }),
  )
  await writeTextFile(
    path.join(workflowPath, 'test-review.md'),
    await renderWorkflowTemplate(testReviewTemplatePath, { WORKFLOW_ID: workflowId }),
  )
  await writeTextFile(path.join(workflowPath, 'code-change.md'), renderCodeChangeArtifact(workflowId))
  await writeTextFile(path.join(workflowPath, 'test-report.md'), renderTestReportArtifact(workflowId))
  await writeTextFile(
    path.join(workflowPath, 'review.md'),
    await renderWorkflowTemplate(reviewTemplatePath, { WORKFLOW_ID: workflowId }),
  )
  await writeTextFile(path.join(workflowPath, 'final-summary.md'), renderFinalSummaryArtifact(workflowId))
  await writeJsonFile(
    path.join(workflowPath, 'knowledge-delta.json'),
    buildKnowledgeDeltaTemplate(workflowId, createdAt),
  )

  return {
    workflowId,
    workflowPath,
    manifest,
  }
}

function inferTargetFromType(type) {
  const normalizedType = String(type || '').toLowerCase()

  if (normalizedType.includes('arch')) {
    return 'ARCHITECTURE.md'
  }

  if (normalizedType.includes('convention') || normalizedType.includes('rule')) {
    return 'docs/CONVENTIONS.md'
  }

  if (normalizedType.includes('domain') || normalizedType.includes('product')) {
    return 'docs/DOMAIN.md'
  }

  if (normalizedType.includes('decision') || normalizedType.includes('adr')) {
    return 'docs/decisions/'
  }

  return 'docs/generated/run-knowledge/'
}

export async function applyCanonicalDocUpdates(result) {
  const updates = []

  for (const [index, candidateFact] of (result.knowledgeDelta?.candidateFacts ?? []).entries()) {
    const target = candidateFact.recommendedTarget || inferTargetFromType(candidateFact.type)

    if (target === 'docs/generated/run-knowledge/') {
      updates.push({ target, fact: candidateFact.fact, status: 'already_present' })
      continue
    }

    if (target === 'docs/decisions/') {
      const fileName = `ADR-auto-${result.workflowId}-${String(index + 1).padStart(2, '0')}-${slugify(candidateFact.fact).slice(0, 48)}.md`
      const decisionPath = path.join(decisionsRoot, fileName)
      const relativeDecisionPath = toRelativePath(decisionPath)

      if (await exists(decisionPath)) {
        updates.push({ target: relativeDecisionPath, fact: candidateFact.fact, status: 'already_present' })
        continue
      }

      await writeTextFile(decisionPath, renderDecisionRecord(candidateFact, result.workflowId))
      updates.push({ target: relativeDecisionPath, fact: candidateFact.fact, status: 'applied' })
      continue
    }

    const config = canonicalKnowledgeSections[target]

    if (!config) {
      updates.push({ target, fact: candidateFact.fact, status: 'skipped' })
      continue
    }

    const absoluteTargetPath = path.join(repoRoot, target)
    const currentContent = await fs.readFile(absoluteTargetPath, 'utf8')
    const { content, status } = upsertCanonicalKnowledgeEntry(
      currentContent,
      config,
      candidateFact,
      result.workflowId,
    )

    if (status === 'applied') {
      await writeTextFile(absoluteTargetPath, content, { overwrite: true })
    }

    updates.push({ target, fact: candidateFact.fact, status })
  }

  return updates
}

function validateCandidateFact(candidateFact, index) {
  const requiredKeys = ['fact', 'type', 'rationale', 'supportingArtifacts', 'freshness']
  const issues = []

  for (const key of requiredKeys) {
    if (!(key in candidateFact)) {
      issues.push(`candidateFacts[${index}] 缺少字段 ${key}`)
    }
  }

  if ('supportingArtifacts' in candidateFact && !Array.isArray(candidateFact.supportingArtifacts)) {
    issues.push(`candidateFacts[${index}].supportingArtifacts 必须是数组`)
  }

  return issues
}

function validatePlanArtifact(content) {
  const issues = []

  if (!content.includes('Plan Status:')) {
    issues.push('plan.md 缺少 Plan Status 字段')
  }

  const missingSections = requiredPlanSections.filter((heading) => !content.includes(heading))

  if (missingSections.length > 0) {
    issues.push(`plan.md 缺少结构段落: ${missingSections.join(', ')}`)
  }

  return issues
}

async function getPlanJsonValidator() {
  if (!planJsonValidatorPromise) {
    planJsonValidatorPromise = (async () => {
      const schema = JSON.parse(await fs.readFile(planJsonSchemaPath, 'utf8'))
      return ajv.compile(schema)
    })()
  }

  return planJsonValidatorPromise
}

function extractSingleLineValue(content, label) {
  const match = content.match(new RegExp(`^${label}:\\s*(.+)$`, 'm'))
  return match ? match[1].trim() : null
}

async function validatePlanJsonArtifact(rawContent, workflowId) {
  const issues = []
  let parsed = null

  try {
    parsed = JSON.parse(rawContent)
  } catch (error) {
    issues.push(`plan.json 无法解析: ${error.message}`)
    return { issues, planData: null }
  }

  const validator = await getPlanJsonValidator()
  const valid = validator(parsed)

  if (!valid) {
    for (const error of validator.errors ?? []) {
      const instancePath = error.instancePath || '/'
      issues.push(`plan.json schema 校验失败: ${instancePath} ${error.message}`)
    }
  }

  if (rawContent.includes('TODO:')) {
    issues.push('plan.json 仍包含 TODO 占位')
  }

  if (parsed.workflowId !== workflowId) {
    issues.push('plan.json 中的 workflowId 与目录名不一致')
  }

  const blockingQuestions = Array.isArray(parsed.openQuestions)
    ? parsed.openQuestions.filter((question) => question.blocking)
    : []

  if (parsed.planStatus === 'needs_clarification' && blockingQuestions.length === 0) {
    issues.push('plan.json 标记为 needs_clarification，但没有 blocking=true 的 openQuestions')
  }

  if (parsed.planStatus === 'ready' && blockingQuestions.length > 0) {
    issues.push('plan.json 标记为 ready，但仍存在 blocking=true 的 openQuestions')
  }

  return { issues, planData: parsed }
}

function validateClarificationArtifact(content, planData) {
  const issues = []
  const status = extractSingleLineValue(content, 'Clarification Status')

  if (!status) {
    issues.push('clarification.md 缺少 Clarification Status 字段')
    return issues
  }

  const missingSections = requiredClarificationSections.filter((heading) => !content.includes(heading))

  if (missingSections.length > 0) {
    issues.push(`clarification.md 缺少结构段落: ${missingSections.join(', ')}`)
  }

  if (!['not_needed', 'open', 'resolved'].includes(status)) {
    issues.push('clarification.md 的 Clarification Status 只能是 not_needed、open 或 resolved')
  }

  if (planData?.planStatus === 'ready' && status === 'open') {
    issues.push('plan.json 已是 ready，但 clarification.md 仍是 open')
  }

  if (planData?.planStatus === 'needs_clarification' && status !== 'open') {
    issues.push('plan.json 是 needs_clarification 时，clarification.md 必须为 open')
  }

  return issues
}

function validateReviewArtifact(content) {
  const issues = []
  const reviewStatus = extractSingleLineValue(content, 'Review Status')
  const reviewerAgent = extractSingleLineValue(content, 'Reviewer Agent')

  if (!reviewStatus) {
    issues.push('review.md 缺少 Review Status 字段')
    return issues
  }

  if (!reviewerAgent) {
    issues.push('review.md 缺少 Reviewer Agent 字段')
  }

  const missingSections = requiredReviewSections.filter((heading) => !content.includes(heading))

  if (missingSections.length > 0) {
    issues.push(`review.md 缺少结构段落: ${missingSections.join(', ')}`)
  }

  if (!['pending', 'changes_requested', 'approved'].includes(reviewStatus)) {
    issues.push('review.md 的 Review Status 只能是 pending、changes_requested 或 approved')
  }

  if (reviewStatus !== 'approved') {
    issues.push('review.md 的 Review Status 必须为 approved，workflow 才能进入 reconcile')
  }

  return issues
}

export async function validateWorkflow(workflowId) {
  const workflowPath = getWorkflowPath(workflowId)
  const result = {
    workflowId,
    workflowPath,
    issues: [],
    warnings: [],
    missingFiles: [],
    placeholderFiles: [],
    manifest: null,
    planData: null,
    knowledgeDelta: null,
  }

  if (!(await exists(workflowPath))) {
    result.issues.push(`找不到 workflow: ${workflowId}`)
    return result
  }

  for (const fileName of requiredWorkflowFiles) {
    const absolutePath = path.join(workflowPath, fileName)
    if (!(await exists(absolutePath))) {
      result.missingFiles.push(fileName)
    }
  }

  if (result.missingFiles.length > 0) {
    result.issues.push(`缺少必需文件: ${result.missingFiles.join(', ')}`)
    return result
  }

  try {
    result.manifest = await readJsonFile(path.join(workflowPath, 'manifest.json'))
  } catch (error) {
    result.issues.push(`manifest.json 无法解析: ${error.message}`)
  }

  try {
    result.knowledgeDelta = await readJsonFile(path.join(workflowPath, 'knowledge-delta.json'))
  } catch (error) {
    result.issues.push(`knowledge-delta.json 无法解析: ${error.message}`)
  }

  const planJsonPath = path.join(workflowPath, 'plan.json')

  if (await exists(planJsonPath)) {
    const rawPlanJson = await fs.readFile(planJsonPath, 'utf8')
    const { issues, planData } = await validatePlanJsonArtifact(rawPlanJson, workflowId)
    result.issues.push(...issues)
    result.planData = planData
  }

  const codingArtifactsRequired = result.planData?.planStatus === 'ready'

  if (codingArtifactsRequired) {
    const missingCodingArtifacts = []

    for (const fileName of codingStageArtifactFiles) {
      const absolutePath = path.join(workflowPath, fileName)
      if (!(await exists(absolutePath))) {
        missingCodingArtifacts.push(fileName)
      }
    }

    if (missingCodingArtifacts.length > 0) {
      result.missingFiles.push(...missingCodingArtifacts)
      result.issues.push(`plan 已 ready，但缺少 Coding 阶段必需文件: ${missingCodingArtifacts.join(', ')}`)
      return result
    }
  }

  if (result.manifest && result.manifest.workflowId !== workflowId) {
    result.issues.push('manifest.json 中的 workflowId 与目录名不一致')
  }

  if (result.knowledgeDelta && result.knowledgeDelta.sourceWorkflowId !== workflowId) {
    result.issues.push('knowledge-delta.json 中的 sourceWorkflowId 与目录名不一致')
  }

  if (result.knowledgeDelta && !Array.isArray(result.knowledgeDelta.candidateFacts)) {
    result.issues.push('knowledge-delta.json 中的 candidateFacts 必须是数组')
  }

  if (Array.isArray(result.knowledgeDelta?.candidateFacts)) {
    result.knowledgeDelta.candidateFacts.forEach((candidateFact, index) => {
      result.issues.push(...validateCandidateFact(candidateFact, index))
    })
  }

  const planMarkdownPath = path.join(workflowPath, 'plan.md')
  const planMarkdownContent = await fs.readFile(planMarkdownPath, 'utf8')
  const markdownPlanStatus = extractSingleLineValue(planMarkdownContent, 'Plan Status')

  result.issues.push(...validatePlanArtifact(planMarkdownContent))

  if (result.planData && markdownPlanStatus && markdownPlanStatus !== result.planData.planStatus) {
    result.issues.push('plan.md 与 plan.json 的 Plan Status 不一致')
  }

  const clarificationMarkdownPath = path.join(workflowPath, 'clarification.md')
  const clarificationMarkdownContent = await fs.readFile(clarificationMarkdownPath, 'utf8')
  result.issues.push(...validateClarificationArtifact(clarificationMarkdownContent, result.planData))

  if (result.planData?.planStatus === 'ready') {
    const reviewMarkdownPath = path.join(workflowPath, 'review.md')
    const reviewMarkdownContent = await fs.readFile(reviewMarkdownPath, 'utf8')
    result.issues.push(...validateReviewArtifact(reviewMarkdownContent))
  }

  if (result.planData?.planStatus === 'needs_clarification') {
    result.issues.push('plan.json 当前为 needs_clarification，workflow 不能进入 Coding')
  }

  const placeholderCheckedFiles = codingArtifactsRequired
    ? [...markdownArtifactFiles, ...codingStageMarkdownArtifactFiles]
    : markdownArtifactFiles

  for (const fileName of placeholderCheckedFiles) {
    const content = await fs.readFile(path.join(workflowPath, fileName), 'utf8')

    if (content.includes('TODO:')) {
      result.placeholderFiles.push(fileName)
    }
  }

  if (result.placeholderFiles.length > 0) {
    result.issues.push(`仍有未完成模板占位: ${result.placeholderFiles.join(', ')}`)
  }

  return result
}

function renderCandidateFacts(knowledgeDelta) {
  if (!knowledgeDelta.candidateFacts.length) {
    return '- 本次没有申报 candidate facts。\n'
  }

  return knowledgeDelta.candidateFacts
    .map((candidateFact, index) => {
      const recommendedTarget = candidateFact.recommendedTarget || inferTargetFromType(candidateFact.type)
      const supportingArtifacts = Array.isArray(candidateFact.supportingArtifacts)
        ? candidateFact.supportingArtifacts.map((artifact) => `  - ${artifact}`).join('\n')
        : '  - 无'

      return `${index + 1}. ${candidateFact.fact}
   - type: ${candidateFact.type}
   - rationale: ${candidateFact.rationale}
   - freshness: ${candidateFact.freshness}
   - recommendedTarget: ${recommendedTarget}
   - supportingArtifacts:
${supportingArtifacts}`
    })
    .join('\n') + '\n'
}

function renderTargetBuckets(knowledgeDelta) {
  const buckets = new Map()

  for (const candidateFact of knowledgeDelta.candidateFacts) {
    const target = candidateFact.recommendedTarget || inferTargetFromType(candidateFact.type)
    if (!buckets.has(target)) {
      buckets.set(target, [])
    }
    buckets.get(target).push(candidateFact.fact)
  }

  if (buckets.size === 0) {
    return '- 本次没有进入 canonical docs 的候选项。\n'
  }

  return Array.from(buckets.entries())
    .map(([target, facts]) => {
      const items = facts.map((fact) => `  - ${fact}`).join('\n')
      return `- ${target}\n${items}`
    })
    .join('\n') + '\n'
}

function renderCanonicalUpdateResults(canonicalDocUpdates) {
  if (canonicalDocUpdates.length === 0) {
    return '- 本次没有可写回 canonical docs 的 candidate facts。\n'
  }

  return canonicalDocUpdates
    .map((update) => {
      const statusLabel =
        update.status === 'applied'
          ? 'applied'
          : update.status === 'already_present'
            ? 'already_present'
            : 'skipped'

      return `- ${update.target}\n  - ${statusLabel}: ${update.fact}`
    })
    .join('\n') + '\n'
}

export function renderRunKnowledge(result, canonicalDocUpdates = []) {
  const { workflowId, manifest, knowledgeDelta } = result

  return `# Run Knowledge: ${workflowId}

## Summary

- Goal: ${manifest.goal || '未填写'}
- Created At: ${manifest.createdAt}
- Reconciled At: ${new Date().toISOString()}
- Review Required: ${knowledgeDelta.reviewRequired ? 'yes' : 'no'}
- Confidence: ${knowledgeDelta.confidence}

## Artifact Index

- artifacts/workflows/${workflowId}/plan.md
- artifacts/workflows/${workflowId}/plan.json
- artifacts/workflows/${workflowId}/clarification.md
- artifacts/workflows/${workflowId}/tdd-cycle.md
- artifacts/workflows/${workflowId}/test-review.md
- artifacts/workflows/${workflowId}/code-change.md
- artifacts/workflows/${workflowId}/test-report.md
- artifacts/workflows/${workflowId}/review.md
- artifacts/workflows/${workflowId}/final-summary.md
- artifacts/workflows/${workflowId}/knowledge-delta.json

## Affected Areas

${knowledgeDelta.affectedAreas.length > 0 ? knowledgeDelta.affectedAreas.map((area) => `- ${area}`).join('\n') : '- 暂未填写 affectedAreas'}

## Candidate Facts

${renderCandidateFacts(knowledgeDelta)}
## Recommended Targets

${renderTargetBuckets(knowledgeDelta)}
## Canonical Doc Updates

${renderCanonicalUpdateResults(canonicalDocUpdates)}
## Notes

- 本文件由 docs reconcile 脚本生成。
- 它是 generated run knowledge，不直接等同于 canonical docs。
- Docs Reconciler 会基于 knowledge delta 对 canonical docs 做受控写回，而不是整篇自由重写。
`
}

export function renderReconciliationReport(result, generatedKnowledgePath, canonicalDocUpdates = []) {
  const { workflowId, manifest, knowledgeDelta } = result

  return `# Reconciliation Report

Workflow ID: ${workflowId}

## Goal

${manifest.goal || '未填写'}

## Generated Run Knowledge

- ${generatedKnowledgePath}

## Candidate Canonical Updates

${renderTargetBuckets(knowledgeDelta)}
## Applied Canonical Updates

${renderCanonicalUpdateResults(canonicalDocUpdates)}
## Manual Review Checklist

- [ ] 是否有事实应该进入 ARCHITECTURE.md
- [ ] 是否有约定应该进入 docs/CONVENTIONS.md
- [ ] 是否有术语或产品规则应该进入 docs/DOMAIN.md
- [ ] 是否有关键取舍应该新增 ADR
- [ ] 是否有内容应继续仅保留在 generated run knowledge

## Source Design Inputs

${sourceDesignDocs.map((filePath) => `- ${filePath}`).join('\n')}
`
}

export function summarizeValidation(result) {
  const lines = [`workflow: ${toRelativePath(result.workflowPath)}`]

  if (result.issues.length === 0) {
    lines.push('status: valid')
  } else {
    lines.push('status: invalid')
    for (const issue of result.issues) {
      lines.push(`issue: ${issue}`)
    }
  }

  if (result.warnings.length > 0) {
    for (const warning of result.warnings) {
      lines.push(`warning: ${warning}`)
    }
  }

  return lines.join('\n')
}
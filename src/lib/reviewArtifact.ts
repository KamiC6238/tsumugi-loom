export type ReviewArtifactStatus = 'pending' | 'changes_requested' | 'approved'

export type ReviewDisposition = 'rework_required' | 'proceed_with_known_issues' | 'approved'

export interface ReviewArtifactSummary {
  status: ReviewArtifactStatus | null
  round: number | null
  disposition: ReviewDisposition | null
  findings: string[]
  requiredRework: string[]
  unresolvedFollowUps: string[]
  hasFinalConclusion: boolean
}

function escapeForRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractSingleLineValue(content: string, label: string) {
  const match = content.match(new RegExp(`^${escapeForRegExp(label)}:\\s*(.+)$`, 'm'))

  return match ? match[1].trim() : null
}

function extractSection(content: string, heading: string) {
  const match = content.match(
    new RegExp(`${escapeForRegExp(heading)}\\n\\n([\\s\\S]*?)(?=\\n## |$)`),
  )

  return match ? match[1].trim() : ''
}

function extractOrderedItems(section: string) {
  return section
    .split('\n')
    .map((line) => line.match(/^\d+\.\s+(.*)$/)?.[1].trim())
    .filter((item): item is string => Boolean(item))
}

function isEmptyFinding(item: string) {
  return /^(无问题|未发现问题|无)([。.]?)$/u.test(item)
}

function isEmptyRework(item: string) {
  return /^无([。.]?)$/u.test(item)
}

export function parseReviewArtifact(content: string): ReviewArtifactSummary {
  const statusValue = extractSingleLineValue(content, 'Review Status')
  const roundValue = Number.parseInt(extractSingleLineValue(content, 'Review Round') ?? '', 10)
  const dispositionValue = extractSingleLineValue(content, 'Review Disposition')

  const findings = extractOrderedItems(extractSection(content, '## Findings')).filter(
    (item) => !isEmptyFinding(item),
  )
  const requiredRework = extractOrderedItems(extractSection(content, '## Required Rework')).filter(
    (item) => !isEmptyRework(item),
  )
  const status = ['pending', 'changes_requested', 'approved'].includes(statusValue ?? '')
    ? (statusValue as ReviewArtifactStatus)
    : null
  const disposition = ['rework_required', 'proceed_with_known_issues', 'approved'].includes(
    dispositionValue ?? '',
  )
    ? (dispositionValue as ReviewDisposition)
    : null
  const round = Number.isInteger(roundValue) ? roundValue : null
  const hasFinalConclusion =
    (status === 'approved' && disposition === 'approved') ||
    (status === 'changes_requested' && round === 3 && disposition === 'proceed_with_known_issues')

  return {
    status,
    round,
    disposition,
    findings,
    requiredRework,
    unresolvedFollowUps: disposition === 'proceed_with_known_issues' ? requiredRework : [],
    hasFinalConclusion,
  }
}
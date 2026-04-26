export type SkillKind = 'macro' | 'node'

export interface SkillCatalogItem {
  id: string
  name: string
  description: string
  argumentHint: string | null
  userInvocable: boolean
  kind: SkillKind
  path: string
  raw: string
}

type FrontmatterValue = boolean | string

interface SkillFrontmatter {
  name?: FrontmatterValue
  description?: FrontmatterValue
  kind?: FrontmatterValue
  type?: FrontmatterValue
  'argument-hint'?: FrontmatterValue
  'user-invocable'?: FrontmatterValue
}

const skillModules = import.meta.glob('../../.github/skills/*/SKILL.md', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>

const macroSkillTerms = [
  'workflow',
  'plan',
  'coding',
  'review',
  'commit',
  'push',
  'docs',
  'documentation',
  'reconciler',
]

export const skillCatalog = buildSkillCatalog(skillModules)

export function parseSkillMarkdown(raw: string, sourcePath: string): SkillCatalogItem {
  const frontmatter = parseFrontmatter(raw)
  const id = getSkillIdFromPath(sourcePath)
  const name = getStringValue(frontmatter.name) ?? id
  const description = getStringValue(frontmatter.description) ?? ''
  const kind = classifySkillKind({
    description,
    kind: getStringValue(frontmatter.kind) ?? getStringValue(frontmatter.type),
    name,
  })

  return {
    id,
    name,
    description,
    argumentHint: getStringValue(frontmatter['argument-hint']),
    userInvocable: frontmatter['user-invocable'] === true,
    kind,
    path: normalizeSkillPath(sourcePath),
    raw,
  }
}

export function buildSkillCatalog(modules: Record<string, string>): SkillCatalogItem[] {
  return Object.entries(modules)
    .map(([sourcePath, raw]) => parseSkillMarkdown(raw, sourcePath))
    .sort(compareSkills)
}

export function classifySkillKind(metadata: {
  name: string
  description?: string
  kind?: string | null
}): SkillKind {
  if (metadata.kind === 'macro' || metadata.kind === 'node') {
    return metadata.kind
  }

  const searchableText = `${metadata.name} ${metadata.description ?? ''}`.toLowerCase()

  return macroSkillTerms.some((term) => searchableText.includes(term)) ? 'macro' : 'node'
}

export function toggleSkillId(selectedSkillIds: readonly string[], skillId: string): string[] {
  const uniqueSkillIds = Array.from(new Set(selectedSkillIds))

  if (uniqueSkillIds.includes(skillId)) {
    return uniqueSkillIds.filter((selectedSkillId) => selectedSkillId !== skillId)
  }

  return [...uniqueSkillIds, skillId]
}

export function getAddedSkills(
  catalog: readonly SkillCatalogItem[],
  selectedSkillIds: readonly string[],
): SkillCatalogItem[] {
  const selectedIdSet = new Set(selectedSkillIds)

  return catalog.filter((skill) => selectedIdSet.has(skill.id))
}

export function getAddedNodeSkills(
  catalog: readonly SkillCatalogItem[],
  selectedSkillIds: readonly string[],
): SkillCatalogItem[] {
  return getAddedSkills(catalog, selectedSkillIds).filter((skill) => skill.kind === 'node')
}

function parseFrontmatter(raw: string): SkillFrontmatter {
  const lines = raw.trimStart().split(/\r?\n/)

  if (lines[0]?.trim() !== '---') {
    return {}
  }

  const fields: Record<string, FrontmatterValue> = {}

  for (const line of lines.slice(1)) {
    if (line.trim() === '---') {
      break
    }

    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)

    if (!match) {
      continue
    }

    fields[match[1]] = parseFrontmatterValue(match[2])
  }

  return fields
}

function parseFrontmatterValue(rawValue: string): FrontmatterValue {
  const value = rawValue.trim()

  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  if (
    (value.startsWith("'") && value.endsWith("'"))
    || (value.startsWith('"') && value.endsWith('"'))
  ) {
    return value.slice(1, -1)
  }

  return value
}

function getStringValue(value: FrontmatterValue | undefined): string | null {
  return typeof value === 'string' ? value : null
}

function getSkillIdFromPath(sourcePath: string): string {
  const normalizedPath = sourcePath.replaceAll('\\', '/')
  const match = normalizedPath.match(/\.github\/skills\/([^/]+)\/SKILL\.md$/)

  return match?.[1] ?? normalizedPath.split('/').at(-2) ?? 'unknown-skill'
}

function normalizeSkillPath(sourcePath: string): string {
  const normalizedPath = sourcePath.replaceAll('\\', '/')
  const match = normalizedPath.match(/\.github\/skills\/[^/]+\/SKILL\.md$/)

  return match?.[0] ?? normalizedPath
}

function compareSkills(firstSkill: SkillCatalogItem, secondSkill: SkillCatalogItem): number {
  if (firstSkill.kind !== secondSkill.kind) {
    return firstSkill.kind === 'macro' ? -1 : 1
  }

  return firstSkill.name.localeCompare(secondSkill.name)
}
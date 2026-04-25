import { describe, expect, it } from 'vitest'

import { parseReviewArtifact } from '../../src/lib/reviewArtifact'
import reviewArtifactRaw from '../../artifacts/workflows/20260425-095256-vue-flow-mvp-five-node-dag-spike/review.md?raw'

describe('parseReviewArtifact', () => {
  it('parses the current approved workflow review artifact', () => {
    const summary = parseReviewArtifact(reviewArtifactRaw)

    expect(summary).toMatchObject({
      status: 'approved',
      round: 3,
      disposition: 'approved',
      hasFinalConclusion: true,
      unresolvedFollowUps: [],
    })
    expect(summary.findings).toContain(
      '首轮 review 发现画布选中态与详情面板选中态不是同一个数据源，导致默认状态与点击切换不同步。',
    )
  })

  it('keeps unresolved follow-up items when round three proceeds with known issues', () => {
    const summary = parseReviewArtifact(`# Code Review Artifact

Workflow ID: 20990101-000000-review-handoff
Review Skill: .github/skills/code-review-writer/SKILL.md
Reviewer Agent: .github/agents/code-reviewer.agent.md
Review Status: changes_requested
Review Round: 3
Review Disposition: proceed_with_known_issues

## Scope Reviewed

1. src/App.vue

## Findings

1. 详情面板还缺少 review findings 透出。

## Risks and Regressions

1. 如果继续隐藏这些问题，用户会误以为 review 已完全通过。

## Required Rework

1. 在界面里显示 review findings 和 follow-up。
2. 让人可以接手处理遗留问题。

## Resolution Notes

自动 review 已达到第 3 轮，因此继续下一步并把问题交给人处理。`)

    expect(summary.hasFinalConclusion).toBe(true)
    expect(summary.unresolvedFollowUps).toEqual([
      '在界面里显示 review findings 和 follow-up。',
      '让人可以接手处理遗留问题。',
    ])
  })
})
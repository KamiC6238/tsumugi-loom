import { describe, expect, it } from 'vitest'

import {
  createWorkflowRunRequest,
  getExecutableWorkflowNodes,
  getWorkflowRunReadiness,
} from '../../src/lib/workflowRuns'
import type { GithubIssue } from '../../src/lib/github'
import type { WorkflowRecord } from '../../src/lib/workflows'

const issue: GithubIssue = {
  id: 21,
  number: 4,
  title: 'Add Copilot runner workflow',
  state: 'open',
  url: 'https://github.com/octo-org/hello-world/issues/4',
  author: 'mona',
  labels: ['automation'],
  comments: 2,
  createdAt: '2026-04-28T00:00:00Z',
  updatedAt: '2026-04-29T00:00:00Z',
}

const runnableWorkflow: WorkflowRecord = {
  id: 'workflow-1',
  name: 'Issue automation',
  accent: '#3f6c62',
  nodes: [
    {
      id: 'workflow-1-coding',
      position: { x: 400, y: 0 },
      data: { label: 'Implement plan' },
    },
    {
      id: 'workflow-1-review',
      type: 'output',
      position: { x: 0, y: 0 },
      data: { label: 'Review changes' },
    },
    {
      id: 'workflow-1-start',
      type: 'input',
      position: { x: 200, y: 0 },
      data: { label: 'Plan issue' },
    },
  ],
  edges: [
    {
      id: 'start-coding',
      source: 'workflow-1-start',
      target: 'workflow-1-coding',
    },
    {
      id: 'coding-review',
      source: 'workflow-1-coding',
      target: 'workflow-1-review',
    },
  ],
  nodeConfigs: {
    'workflow-1-start': { name: 'Plan issue', skillId: 'plan-writer' },
    'workflow-1-coding': { name: 'Implement plan', skillId: 'tdd-coding-writer' },
    'workflow-1-review': { name: 'Review changes', skillId: 'code-review-writer' },
  },
}

describe('workflow run helpers', () => {
  it('extracts executable nodes in workflow edge order with assigned skills', () => {
    expect(getExecutableWorkflowNodes(runnableWorkflow)).toEqual([
      {
        order: 1,
        nodeId: 'workflow-1-start',
        name: 'Plan issue',
        skillId: 'plan-writer',
      },
      {
        order: 2,
        nodeId: 'workflow-1-coding',
        name: 'Implement plan',
        skillId: 'tdd-coding-writer',
      },
      {
        order: 3,
        nodeId: 'workflow-1-review',
        name: 'Review changes',
        skillId: 'code-review-writer',
      },
    ])
  })

  it('blocks a run when any workflow node is missing a skill', () => {
    const workflow: WorkflowRecord = {
      ...runnableWorkflow,
      nodeConfigs: {
        ...runnableWorkflow.nodeConfigs,
        'workflow-1-coding': { name: 'Implement plan', skillId: null },
      },
    }

    expect(getWorkflowRunReadiness(workflow)).toEqual({
      canRun: false,
      nodes: expect.any(Array),
      missingSkillNodeNames: ['Implement plan'],
      message: 'Configure skills for every workflow node before running.',
    })
  })

  it('falls back to node data skill ids and preserves node array order when no edges exist', () => {
    const workflow: WorkflowRecord = {
      id: 'workflow-data-skill',
      name: 'Data Skill Flow',
      accent: '#d07a2c',
      nodes: [
        {
          id: 'first-node',
          position: { x: 0, y: 0 },
          data: { label: 'Data skill node', skillId: '  vue  ' },
        },
        {
          id: 'second-node',
          position: { x: 200, y: 0 },
          data: { label: 'Blank skill node', skillId: '   ' },
        },
      ],
      edges: [],
      nodeConfigs: {},
    }

    expect(getExecutableWorkflowNodes(workflow)).toEqual([
      { order: 1, nodeId: 'first-node', name: 'Data skill node', skillId: 'vue' },
      { order: 2, nodeId: 'second-node', name: 'Blank skill node', skillId: null },
    ])
    expect(getWorkflowRunReadiness(workflow)).toMatchObject({
      canRun: false,
      missingSkillNodeNames: ['Blank skill node'],
    })
  })

  it('builds the local runner request payload from an issue and workflow snapshot', () => {
    const request = createWorkflowRunRequest({
      issue,
      workflow: runnableWorkflow,
      now: new Date('2026-04-29T12:00:00.000Z'),
      randomSuffix: 'abc123',
    })

    expect(request).toEqual({
      runId: '20260429-120000-issue-4-workflow-1-abc123',
      createdAt: '2026-04-29T12:00:00.000Z',
      issue,
      workflow: {
        id: 'workflow-1',
        name: 'Issue automation',
        nodes: [
          { order: 1, nodeId: 'workflow-1-start', name: 'Plan issue', skillId: 'plan-writer' },
          { order: 2, nodeId: 'workflow-1-coding', name: 'Implement plan', skillId: 'tdd-coding-writer' },
          { order: 3, nodeId: 'workflow-1-review', name: 'Review changes', skillId: 'code-review-writer' },
        ],
        edges: [
          { id: 'start-coding', source: 'workflow-1-start', target: 'workflow-1-coding' },
          { id: 'coding-review', source: 'workflow-1-coding', target: 'workflow-1-review' },
        ],
      },
      options: {
        maxReviewRounds: 3,
        freshSessionPerNode: true,
        skillInjection: 'snapshot-skill-directory',
      },
    })
  })

  it('marks empty workflows as not runnable', () => {
    const emptyWorkflow: WorkflowRecord = {
      id: 'workflow-empty',
      name: 'Empty',
      accent: '#d07a2c',
      nodes: [],
      edges: [],
      nodeConfigs: {},
    }

    expect(getWorkflowRunReadiness(emptyWorkflow)).toMatchObject({
      canRun: false,
      missingSkillNodeNames: [],
      message: 'Create at least one workflow node before running.',
    })
  })
})

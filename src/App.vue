<script setup lang="ts">
import { computed, ref } from 'vue'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MarkerType, Position, VueFlow, type Edge, type Node } from '@vue-flow/core'
import { MiniMap } from '@vue-flow/minimap'
import reviewArtifactRaw from '../artifacts/workflows/20260425-095256-vue-flow-mvp-five-node-dag-spike/review.md?raw'

import '@vue-flow/controls/dist/style.css'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/minimap/dist/style.css'

import StageNode from './components/StageNode.vue'
import { parseReviewArtifact } from './lib/reviewArtifact'
import {
  getStageById,
  getWorkflowStages,
  summarizeWorkflow,
  workflowConnections,
  workflowStageStatusLabels,
  type WorkflowStage,
  type WorkflowStageId,
} from './lib/workflowGraph'

interface NodeClickPayload {
  node: {
    id: string
  }
}

const workflowStages = getWorkflowStages()
const workflowSummary = summarizeWorkflow(workflowStages)
const reviewArtifact = parseReviewArtifact(reviewArtifactRaw)

const stageLayout: Record<WorkflowStageId, { x: number; y: number }> = {
  plan: { x: 40, y: 120 },
  coding: { x: 350, y: 35 },
  test: { x: 680, y: 150 },
  review: { x: 990, y: 55 },
}

const selectedStageId = ref<WorkflowStageId>(workflowSummary.activeStageId ?? workflowStages[0].id)

const flowNodes = computed<Node<WorkflowStage>[]>(() =>
  workflowStages.map((stage) => ({
    id: stage.id,
    type: 'stage',
    position: stageLayout[stage.id],
    data: stage,
    selected: stage.id === selectedStageId.value,
    draggable: false,
    connectable: false,
    selectable: true,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  })),
)

function edgeColorFor(status: WorkflowStage['status'], isActive: boolean) {
  if (isActive) {
    return '#d07a2c'
  }

  if (status === 'completed') {
    return '#3f6c62'
  }

  return '#9f9181'
}

const flowEdges = computed<Edge[]>(() =>
  workflowConnections.map((connection) => {
    const sourceStage = getStageById(connection.source)
    const sourceStatus = sourceStage?.status ?? 'queued'
    const isActive = connection.source === workflowSummary.activeStageId
    const stroke = edgeColorFor(sourceStatus, isActive)

    return {
      id: `${connection.source}-${connection.target}`,
      source: connection.source,
      target: connection.target,
      type: 'smoothstep',
      animated: isActive,
      label: connection.handoff,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: stroke,
      },
      style: {
        stroke,
        strokeWidth: isActive ? 2.8 : 2,
      },
      labelStyle: {
        fill: '#5d5248',
        fontSize: '12px',
        fontWeight: 600,
      },
      labelBgStyle: {
        fill: '#f8f1e6',
        fillOpacity: 0.96,
      },
      labelBgPadding: [8, 4],
      labelBgBorderRadius: 999,
    }
  }),
)

const activeStage = computed(() =>
  workflowSummary.activeStageId ? getStageById(workflowSummary.activeStageId) : null,
)

const selectedStage = computed(() => getStageById(selectedStageId.value) ?? workflowStages[0])

const readinessRatio = computed(
  () => `${workflowSummary.completedStages + workflowSummary.runningStages}/${workflowSummary.totalStages}`,
)

const reviewContextVisible = computed(() => selectedStage.value.id === 'review')

const reviewDispositionLabel = computed(() => {
  switch (reviewArtifact.disposition) {
    case 'approved':
      return 'Approved'
    case 'proceed_with_known_issues':
      return 'Proceed with known issues'
    case 'rework_required':
      return 'Rework required'
    default:
      return 'Unknown'
  }
})

const reviewHandoffSummary = computed(() => {
  if (reviewArtifact.status === 'approved') {
    return `Latest review reached approved in round ${reviewArtifact.round ?? 'n/a'}, so the standard workflow can close here.`
  }

  if (reviewArtifact.hasFinalConclusion) {
    return `Round ${reviewArtifact.round ?? 'n/a'} ended with known follow-up items, so the review concludes and leaves the listed items to a human.`
  }

  return 'The current review artifact is still in progress and will continue with another implementation round.'
})

function selectStage(stageId: WorkflowStageId) {
  selectedStageId.value = stageId
}

function handleNodeClick(payload: NodeClickPayload) {
  if (getStageById(payload.node.id as WorkflowStageId)) {
    selectStage(payload.node.id as WorkflowStageId)
  }
}

function minimapNodeColor(node: Node<WorkflowStage>) {
  const status = node.data?.status ?? 'queued'

  switch (status) {
    case 'completed':
      return '#3f6c62'
    case 'running':
      return '#d07a2c'
    case 'blocked':
      return '#8a5a52'
    default:
      return '#948678'
  }
}
</script>

<template>
  <main class="shell">
    <section class="hero-panel">
      <div class="hero-panel__copy">
        <p class="eyebrow">Tsumugi Loom MVP Spike</p>
        <h1>Four stages, one workflow directory, and every handoff kept explicit.</h1>
        <p class="hero-panel__lede">
          This canvas turns the current standard workflow into a visual contract: Plan creates the
          handoff plan, TDD Coding owns the implementation loop, Testing runs every automated case,
          and Code Review captures the final review conclusion with any remaining human follow-up.
        </p>

        <div class="hero-panel__tags">
          <span>artifact-first</span>
          <span>workflow-dir</span>
          <span>human-in-the-loop</span>
          <span>Vue Flow spike</span>
        </div>
      </div>

      <div class="hero-panel__stats">
        <article class="stat-card">
          <span class="stat-card__label">Stages in motion</span>
          <strong>{{ readinessRatio }}</strong>
          <p>Completed plus running stages in the current demo trace.</p>
        </article>

        <article class="stat-card">
          <span class="stat-card__label">Artifacts surfaced</span>
          <strong>{{ workflowSummary.outputArtifacts }}</strong>
          <p>Documents and outputs the graph makes explicit between node boundaries.</p>
        </article>

        <article class="stat-card">
          <span class="stat-card__label">Current active node</span>
          <strong>{{ activeStage?.title ?? 'None' }}</strong>
          <p>{{ activeStage?.actionLabel ?? 'Waiting for the next executable stage.' }}</p>
        </article>
      </div>
    </section>

    <section class="workspace">
      <section class="flow-card">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Graph Canvas</p>
            <h2>Execution order stays linear while every stage keeps updating the same workflow.</h2>
          </div>
          <p class="section-heading__hint">
            Click a node to inspect the stage contract, the artifacts it may produce, and the action
            that runs in that stage.
          </p>
        </div>

        <div class="flow-frame">
          <VueFlow
            :nodes="flowNodes"
            :edges="flowEdges"
            :default-viewport="{ x: -40, y: -10, zoom: 0.72 }"
            :min-zoom="0.45"
            :max-zoom="1.2"
            :nodes-draggable="false"
            :nodes-connectable="false"
            :elements-selectable="true"
            class="loom-flow"
            @node-click="handleNodeClick"
          >
            <Background :gap="26" :size="1.2" pattern-color="#d3c5b1" />
            <MiniMap :node-color="minimapNodeColor" pannable zoomable />
            <Controls position="bottom-left" />

            <template #node-stage="nodeProps">
              <StageNode v-bind="nodeProps" />
            </template>
          </VueFlow>
        </div>
      </section>

      <aside class="details-card">
        <div class="section-heading section-heading--stacked">
          <div>
            <p class="eyebrow">Selected Stage</p>
            <h2>{{ selectedStage.title }}</h2>
          </div>
          <span class="status-pill" :class="`status-pill--${selectedStage.status}`">
            {{ workflowStageStatusLabels[selectedStage.status] }}
          </span>
        </div>

        <div class="detail-block">
          <h3 data-testid="selected-stage-title">{{ selectedStage.title }}</h3>
          <p>{{ selectedStage.goal }}</p>
        </div>

        <div class="detail-block detail-grid">
          <article>
            <h3>Primary action</h3>
            <p>{{ selectedStage.actionLabel }}</p>
          </article>
          <article>
            <h3>Skill or runtime</h3>
            <p>{{ selectedStage.skill }}</p>
          </article>
          <article>
            <h3>Reviewer gate</h3>
            <p>{{ selectedStage.reviewer ?? 'No external reviewer on this stage.' }}</p>
          </article>
          <article>
            <h3>Entry criteria</h3>
            <p>{{ selectedStage.entryCriteria }}</p>
          </article>
        </div>

        <div class="detail-block">
          <h3>Declared outputs</h3>
          <ul class="artifact-list">
            <li v-for="artifact in selectedStage.outputs" :key="artifact">{{ artifact }}</li>
          </ul>
        </div>

        <div v-if="reviewContextVisible" class="detail-block">
          <h3>Review handoff</h3>
          <p data-testid="review-handoff-summary">{{ reviewHandoffSummary }}</p>
          <p class="detail-note">
            Status: {{ reviewArtifact.status ?? 'unknown' }} · Round: {{ reviewArtifact.round ?? 'n/a' }}
            · Disposition: {{ reviewDispositionLabel }}
          </p>
        </div>

        <div v-if="reviewContextVisible && reviewArtifact.findings.length > 0" class="detail-block">
          <h3>Latest review findings</h3>
          <ul class="artifact-list" data-testid="review-findings-list">
            <li v-for="finding in reviewArtifact.findings" :key="finding">{{ finding }}</li>
          </ul>
        </div>

        <div v-if="reviewContextVisible" class="detail-block">
          <h3>Outstanding human follow-up</h3>
          <p v-if="reviewArtifact.unresolvedFollowUps.length === 0" data-testid="review-follow-up-empty">
            No unresolved review issues remain in the current artifact.
          </p>
          <ul v-else class="issue-list" data-testid="review-follow-up-list">
            <li v-for="issue in reviewArtifact.unresolvedFollowUps" :key="issue">{{ issue }}</li>
          </ul>
        </div>

        <div class="detail-block">
          <h3>Stage order</h3>
          <ol class="stage-list">
            <li
              v-for="stage in workflowStages"
              :key="stage.id"
              :class="['stage-list__item', { 'stage-list__item--selected': stage.id === selectedStage.id }]"
            >
              <button type="button" :data-testid="`stage-list-${stage.id}`" @click="selectStage(stage.id)">
                <span class="stage-list__meta">{{ stage.order }}. {{ stage.title }}</span>
                <span class="stage-list__state">{{ workflowStageStatusLabels[stage.status] }}</span>
              </button>
            </li>
          </ol>
        </div>
      </aside>
    </section>
  </main>
</template>

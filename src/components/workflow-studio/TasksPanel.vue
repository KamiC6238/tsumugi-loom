<script setup lang="ts">
import { storeToRefs } from 'pinia'
import {
  ArrowLeftIcon,
  KeyRoundIcon,
  PlusIcon,
  PlayIcon,
  RefreshCwIcon,
  RotateCcwIcon,
} from 'lucide-vue-next'
import { computed, shallowRef, useTemplateRef, watch } from 'vue'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { parseGithubRepositoryFromGitConfig } from '@/lib/github'
import type { GithubIssue } from '@/lib/github'
import type { WorkflowRecord } from '@/lib/workflows'
import { useGithubTasksStore } from '@/stores/githubTasks'

interface DirectoryHandleLike {
  name: string
  getDirectoryHandle: (name: string) => Promise<DirectoryHandleLike>
  getFileHandle: (name: string) => Promise<FileHandleLike>
}

interface FileHandleLike {
  getFile: () => Promise<File>
}

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: () => Promise<DirectoryHandleLike>
}

const props = withDefaults(defineProps<{
  workflows?: WorkflowRecord[]
}>(), {
  workflows: () => [],
})

const githubTasksStore = useGithubTasksStore()
const {
  selectedRepository,
  authToken,
  issues,
  status,
  errorMessage,
  errorKind,
  isAuthPromptVisible,
  isIssueListEmpty,
  isLoading,
  issueCount,
} = storeToRefs(githubTasksStore)

const tokenInput = shallowRef('')
const isPickingRepository = shallowRef(false)
const selectedIssueId = shallowRef<number | null>(null)
const selectedWorkflowId = shallowRef<string | undefined>(undefined)
const repositoryInput = useTemplateRef<HTMLInputElement>('repositoryInput')

const repositoryTitle = computed(() => selectedRepository.value?.fullName ?? 'Tasks')
const repositorySubtitle = computed(() => {
  if (!selectedRepository.value) {
    return ''
  }

  return selectedRepository.value.localName === selectedRepository.value.fullName
    ? selectedRepository.value.fullName
    : `${selectedRepository.value.localName} · ${selectedRepository.value.fullName}`
})
const selectedIssue = computed<GithubIssue | null>(() => {
  if (selectedIssueId.value === null) {
    return null
  }

  return issues.value.find((issue) => issue.id === selectedIssueId.value) ?? null
})
const hasWorkflows = computed(() => props.workflows.length > 0)
const workflowSelectPlaceholder = computed(() => (
  hasWorkflows.value ? 'Select workflow' : 'No workflows created'
))
const canRunIssueWorkflow = computed(() => Boolean(selectedIssue.value && selectedWorkflowId.value))

watch([selectedRepository, authToken], () => {
  if (!selectedRepository.value) {
    selectedIssueId.value = null
    return
  }

  void githubTasksStore.refreshIssues()
}, { immediate: true })

watch([selectedIssue, status], ([issue, nextStatus]) => {
  if (!issue && selectedIssueId.value !== null && nextStatus === 'ready') {
    selectedIssueId.value = null
  }
})

watch(
  () => props.workflows.map((workflow) => workflow.id),
  (workflowIds) => {
    if (selectedWorkflowId.value && !workflowIds.includes(selectedWorkflowId.value)) {
      selectedWorkflowId.value = undefined
    }
  },
)

function saveAuthToken() {
  const wasSaved = githubTasksStore.setAuthToken(tokenInput.value)

  if (wasSaved) {
    tokenInput.value = ''
  }
}

function openIssueDetail(issueId: number) {
  selectedIssueId.value = issueId
}

function returnToIssueList() {
  selectedIssueId.value = null
}

function runSelectedWorkflow() {
  if (!canRunIssueWorkflow.value) {
    return
  }
}

async function openRepositoryPicker() {
  githubTasksStore.clearError()
  isPickingRepository.value = true

  const picker = (window as DirectoryPickerWindow).showDirectoryPicker

  if (!picker) {
    isPickingRepository.value = false
    repositoryInput.value?.click()
    return
  }

  try {
    const directoryHandle = await picker()
    const gitConfig = await readGitConfigFromDirectoryHandle(directoryHandle)
    const repository = parseGithubRepositoryFromGitConfig(gitConfig, directoryHandle.name)

    if (!repository) {
      githubTasksStore.setRepositoryError('No GitHub remote was found in this repository.')
      return
    }

    githubTasksStore.selectRepository(repository)
  }
  catch (error) {
    if (!isAbortError(error)) {
      githubTasksStore.setRepositoryError('Could not read .git/config from this directory.')
    }
  }
  finally {
    isPickingRepository.value = false
  }
}

async function handleFallbackRepositorySelection(event: Event) {
  const input = event.currentTarget as HTMLInputElement
  const files = Array.from(input.files ?? [])
  const gitConfigFile = files.find((file) => getRelativePath(file).endsWith('.git/config'))

  input.value = ''

  if (!gitConfigFile) {
    githubTasksStore.setRepositoryError('No .git/config file was found in this directory.')
    return
  }

  const repositoryRootName = getRepositoryRootName(gitConfigFile)
  const repository = parseGithubRepositoryFromGitConfig(await gitConfigFile.text(), repositoryRootName)

  if (!repository) {
    githubTasksStore.setRepositoryError('No GitHub remote was found in this repository.')
    return
  }

  githubTasksStore.selectRepository(repository)
}

async function readGitConfigFromDirectoryHandle(directoryHandle: DirectoryHandleLike) {
  const gitDirectoryHandle = await directoryHandle.getDirectoryHandle('.git')
  const configFileHandle = await gitDirectoryHandle.getFileHandle('config')
  const configFile = await configFileHandle.getFile()

  return configFile.text()
}

function getRelativePath(file: File) {
  return (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? file.name
}

function getRepositoryRootName(file: File) {
  const [rootName] = getRelativePath(file).split('/')

  return rootName || 'Repository'
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function formatIssueDate(value: string) {
  if (!value) {
    return 'Unknown'
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

function formatIssueDateTime(value: string) {
  if (!value) {
    return 'Unknown'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
</script>

<template>
  <main class="tasks-panel" data-testid="tasks-panel">
    <input
      ref="repositoryInput"
      class="repository-input"
      type="file"
      webkitdirectory
      directory
      multiple
      tabindex="-1"
      aria-hidden="true"
      @change="handleFallbackRepositorySelection"
    >

    <section
      v-if="!selectedRepository"
      class="tasks-centered-state tasks-centered-state--solo"
      data-testid="tasks-no-repo"
    >
      <p class="tasks-state-line">No repository selected</p>
      <Button
        type="button"
        class="tasks-add-repo-button"
        :disabled="isPickingRepository"
        data-testid="tasks-add-repo"
        @click="openRepositoryPicker"
      >
        <PlusIcon aria-hidden="true" />
        <span>Add repo</span>
      </Button>
      <p v-if="errorKind === 'repository' && errorMessage" class="tasks-error-text">
        {{ errorMessage }}
      </p>
    </section>

    <template v-else>
      <header class="tasks-header">
        <div class="tasks-heading">
          <p class="eyebrow">GitHub tasks</p>
          <h2 class="tasks-title">{{ repositoryTitle }}</h2>
          <p class="tasks-copy">{{ repositorySubtitle }}</p>
        </div>

        <div class="tasks-actions">
          <Button
            type="button"
            variant="outline"
            class="tasks-action-button"
            :disabled="isPickingRepository"
            @click="openRepositoryPicker"
          >
            <RotateCcwIcon aria-hidden="true" />
            <span>Change repo</span>
          </Button>
          <Button
            v-if="!isAuthPromptVisible"
            type="button"
            variant="outline"
            class="tasks-action-button"
            :disabled="isLoading"
            data-testid="tasks-refresh"
            @click="githubTasksStore.refreshIssues()"
          >
            <RefreshCwIcon aria-hidden="true" />
            <span>Refresh</span>
          </Button>
        </div>
      </header>

      <section v-if="isAuthPromptVisible" class="tasks-auth-state" data-testid="tasks-auth-state">
        <div class="tasks-auth-icon" aria-hidden="true">
          <KeyRoundIcon />
        </div>
        <div class="tasks-auth-copy">
          <h3>GitHub authentication required</h3>
          <p v-if="errorKind === 'auth' && errorMessage">{{ errorMessage }}</p>
          <p v-else>Save a personal access token that can access {{ selectedRepository.fullName }}.</p>
        </div>

        <form class="tasks-auth-form" @submit.prevent="saveAuthToken">
          <Label for="github-token">Personal access token</Label>
          <Input
            id="github-token"
            v-model="tokenInput"
            type="password"
            placeholder="github_pat_..."
            autocomplete="off"
            data-testid="github-token-input"
          />
          <Button type="submit" class="tasks-save-token-button" data-testid="github-token-save">
            <KeyRoundIcon aria-hidden="true" />
            <span>Save token</span>
          </Button>
          <Button
            v-if="authToken"
            type="button"
            variant="outline"
            class="tasks-action-button"
            data-testid="github-token-clear"
            @click="githubTasksStore.clearAuthToken()"
          >
            <span>Clear saved token</span>
          </Button>
        </form>
      </section>

      <section v-else-if="isLoading" class="tasks-centered-state" data-testid="tasks-loading">
        <p class="tasks-state-line">Loading issues</p>
      </section>

      <section
        v-else-if="status === 'error'"
        class="tasks-centered-state tasks-centered-state--error"
        data-testid="tasks-error-state"
      >
        <p class="tasks-state-line">Issues could not be loaded</p>
        <p v-if="errorMessage" class="tasks-error-text">{{ errorMessage }}</p>
        <Button type="button" class="tasks-add-repo-button" @click="githubTasksStore.refreshIssues()">
          <RefreshCwIcon aria-hidden="true" />
          <span>Retry</span>
        </Button>
      </section>

      <section v-else-if="isIssueListEmpty" class="tasks-centered-state" data-testid="tasks-empty-state">
        <p class="tasks-state-line">No open issues</p>
        <p class="tasks-empty-copy">{{ selectedRepository.fullName }} is clear right now.</p>
      </section>

      <section
        v-else-if="selectedIssue"
        class="issue-detail-section"
        data-testid="issue-detail"
        aria-labelledby="issue-detail-heading"
      >
        <div class="issue-detail-toolbar">
          <Button
            type="button"
            variant="ghost"
            class="issue-back-button"
            data-testid="issue-detail-back"
            @click="returnToIssueList"
          >
            <ArrowLeftIcon aria-hidden="true" />
            <span>Back</span>
          </Button>
        </div>

        <article class="issue-detail-card">
          <div class="issue-detail-header">
            <div class="issue-detail-heading">
              <p class="issue-number">#{{ selectedIssue.number }}</p>
              <h3 id="issue-detail-heading" class="issue-detail-title">
                {{ selectedIssue.title }}
              </h3>
            </div>

            <div class="issue-detail-actions">
              <span class="issue-state">{{ selectedIssue.state }}</span>

              <div class="issue-detail-run-controls">
                <div class="issue-run-field">
                  <Select v-model="selectedWorkflowId" name="issueWorkflow" :disabled="!hasWorkflows">
                    <SelectTrigger
                      id="issue-workflow"
                      aria-label="Select workflow"
                      class="issue-workflow-select"
                      data-testid="issue-workflow-select"
                    >
                      <SelectValue :placeholder="workflowSelectPlaceholder" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="workflow in workflows"
                        :key="workflow.id"
                        :value="workflow.id"
                        data-testid="issue-workflow-option"
                      >
                        {{ workflow.name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  class="issue-run-button"
                  :disabled="!canRunIssueWorkflow"
                  data-testid="issue-run-button"
                  @click="runSelectedWorkflow"
                >
                  <PlayIcon aria-hidden="true" />
                  <span>Run</span>
                </Button>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section v-else class="tasks-list-section" aria-labelledby="github-issues-heading">
        <div class="tasks-list-heading">
          <h3 id="github-issues-heading">Open issues</h3>
          <span>{{ issueCount }}</span>
        </div>

        <ul class="issue-grid">
          <li v-for="issue in issues" :key="issue.id">
            <button
              type="button"
              class="issue-card"
              :aria-label="`Open issue #${issue.number} details`"
              @click="openIssueDetail(issue.id)"
            >
              <span class="issue-card-header">
                <span class="issue-number">#{{ issue.number }}</span>
                <span class="issue-date">Updated {{ formatIssueDate(issue.updatedAt) }}</span>
              </span>
              <span class="issue-title">
                {{ issue.title }}
              </span>
              <span class="issue-meta">{{ issue.author }}</span>
            </button>
          </li>
        </ul>
      </section>
    </template>
  </main>
</template>

<style scoped>
.tasks-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  min-width: 0;
  min-height: 0;
  gap: 1.35rem;
  padding: 1.75rem;
  border: 1px solid var(--panel-border);
  border-radius: 1.75rem;
  box-shadow: var(--shadow-soft);
  background: var(--panel-background-simple);
  overflow: hidden;
}

.repository-input {
  display: none;
}

.eyebrow {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.tasks-header {
  display: flex;
  min-width: 0;
  align-items: end;
  justify-content: space-between;
  gap: 1.5rem;
}

.tasks-heading {
  display: grid;
  min-width: 0;
  gap: 0.7rem;
}

.tasks-title {
  min-width: 0;
  color: var(--text-primary);
  font-family: var(--font-heading);
  font-size: clamp(2rem, 2.8vw, 2.8rem);
  font-weight: 700;
  line-height: 0.96;
  overflow-wrap: anywhere;
}

.tasks-copy,
.tasks-empty-copy {
  max-width: 34rem;
  color: var(--text-secondary);
  font-size: 1rem;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.tasks-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: end;
  gap: 0.75rem;
}

.tasks-action-button,
.tasks-add-repo-button,
.tasks-save-token-button {
  gap: 0.55rem;
  border-radius: 0.75rem;
  font-weight: 800;
}

.tasks-add-repo-button,
.tasks-save-token-button {
  min-height: 3rem;
  padding-inline: 1rem;
  border: none;
  background: var(--primary-action-background);
  color: var(--primary-action-foreground);
  box-shadow: var(--primary-action-shadow);
}

.tasks-action-button {
  border: 1px solid var(--panel-border);
  background: var(--surface-card-soft);
  color: var(--text-primary);
}

.tasks-action-button svg,
.tasks-add-repo-button svg,
.tasks-save-token-button svg {
  width: 1rem;
  height: 1rem;
}

.tasks-centered-state,
.tasks-auth-state {
  display: grid;
  min-height: 0;
  align-content: center;
  justify-items: center;
  gap: 1rem;
  padding: clamp(2rem, 6vw, 4rem);
  border: 1px dashed var(--panel-border);
  border-radius: 1.5rem;
  background: var(--surface-card-strong);
  text-align: center;
}

.tasks-centered-state--solo {
  grid-row: 1 / -1;
}

.tasks-auth-state {
  max-width: 34rem;
  justify-self: center;
  align-self: center;
}

.tasks-state-line {
  color: var(--text-primary);
  font-size: 1.08rem;
  font-weight: 800;
}

.tasks-centered-state--error {
  border-style: solid;
}

.tasks-error-text {
  max-width: 34rem;
  color: var(--blocked);
  font-size: 0.95rem;
  line-height: 1.5;
}

.tasks-auth-icon {
  display: inline-flex;
  width: 3rem;
  height: 3rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--accent-cool-soft);
  color: var(--accent-cool-text);
}

.tasks-auth-icon svg {
  width: 1.35rem;
  height: 1.35rem;
}

.tasks-auth-copy {
  display: grid;
  gap: 0.45rem;
}

.tasks-auth-copy h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.1rem;
  font-weight: 800;
}

.tasks-auth-copy p {
  max-width: 28rem;
  color: var(--text-secondary);
  line-height: 1.55;
}

.tasks-auth-form {
  display: grid;
  width: min(100%, 24rem);
  gap: 0.75rem;
  text-align: left;
}

.tasks-list-section,
.issue-detail-section {
  display: grid;
  grid-template-rows: auto auto;
  min-height: 0;
  align-content: start;
  gap: 0.75rem;
}

.issue-detail-section {
  grid-template-rows: auto minmax(0, 1fr);
}

.tasks-list-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-secondary);
}

.tasks-list-heading h3 {
  font-size: 0.92rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.tasks-list-heading span {
  display: inline-flex;
  min-width: 2rem;
  min-height: 2rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--surface-card-soft);
  font-weight: 700;
}

.issue-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  grid-auto-rows: max-content;
  min-height: 0;
  align-content: start;
  align-items: start;
  gap: 0.75rem;
  padding: 0;
  margin: 0;
  overflow: auto;
  list-style: none;
}

.issue-card {
  display: grid;
  min-width: 0;
  width: 100%;
  height: max-content;
  align-self: start;
  align-content: start;
  gap: 0.55rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--panel-border);
  border-radius: 0.5rem;
  background: var(--surface-card-soft);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    background-color 180ms ease;
}

.issue-card:hover,
.issue-card:focus-visible {
  transform: translateY(-1px);
  border-color: var(--field-border);
  background: var(--surface-card);
}

.issue-card:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--accent-cool-text) 34%, transparent);
  outline-offset: 2px;
}

.issue-card-header {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.issue-number {
  color: var(--accent-cool-text);
  font-weight: 900;
}

.issue-date,
.issue-meta {
  color: var(--text-subtle);
  font-size: 0.82rem;
}

.issue-title {
  min-width: 0;
  color: var(--text-primary);
  font-size: 1.02rem;
  font-weight: 800;
  line-height: 1.32;
  overflow-wrap: anywhere;
  text-decoration: none;
}

.issue-detail-toolbar {
  display: flex;
  justify-content: start;
}

.issue-back-button,
.issue-run-button {
  gap: 0.5rem;
  border-radius: 0.75rem;
  font-weight: 800;
}

.issue-back-button {
  color: var(--text-secondary);
}

.issue-back-button svg,
.issue-run-button svg {
  width: 1rem;
  height: 1rem;
}

.issue-detail-card {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: 1rem;
  overflow: auto;
}

.issue-detail-header {
  display: flex;
  min-width: 0;
  align-items: stretch;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--panel-border);
  border-radius: 0.5rem;
  background: var(--surface-card-soft);
}

.issue-detail-heading {
  display: grid;
  min-width: 0;
  gap: 0.5rem;
}

.issue-detail-actions {
  display: grid;
  min-width: min(100%, 24rem);
  justify-items: end;
  align-content: space-between;
  gap: 1rem;
}

.issue-detail-title {
  min-width: 0;
  color: var(--text-primary);
  font-size: clamp(1.35rem, 2vw, 2rem);
  font-weight: 900;
  line-height: 1.08;
  overflow-wrap: anywhere;
}

.issue-state {
  display: inline-flex;
  min-height: 1.8rem;
  align-items: center;
  padding: 0 0.65rem;
  border-radius: 999px;
  background: var(--accent-cool-soft);
  color: var(--accent-cool-text);
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.issue-detail-run-controls {
  display: flex;
  width: 100%;
  align-items: end;
  justify-content: end;
  gap: 1rem;
}

.issue-run-field {
  display: grid;
  min-width: min(100%, 18rem);
  width: min(100%, 18rem);
  gap: 0.55rem;
}

.issue-workflow-select {
  min-height: 3rem;
  border-color: var(--field-border);
  background-color: var(--field-background);
}

.issue-run-button {
  min-height: 3rem;
  padding-inline: 1rem;
  border: none;
  background: var(--primary-action-background);
  color: var(--primary-action-foreground);
  box-shadow: var(--primary-action-shadow);
}

@media (max-width: 900px) {
  .tasks-panel {
    height: auto;
    min-height: 32rem;
    overflow: visible;
  }

  .tasks-header {
    flex-direction: column;
    align-items: start;
  }

  .tasks-actions {
    width: 100%;
    justify-content: start;
  }

  .issue-detail-header,
  .issue-detail-run-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .issue-detail-actions {
    min-width: 0;
    justify-items: stretch;
  }

  .issue-state {
    justify-self: start;
  }

  .issue-run-field {
    min-width: 0;
    width: 100%;
  }
}
</style>
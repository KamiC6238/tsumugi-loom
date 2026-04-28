<script setup lang="ts">
import { computed } from 'vue'

import { Switch } from '@/components/ui/switch'
import type { SkillCatalogItem } from '@/lib/skills'

const props = defineProps<{
  addedSkillIds: string[]
  skills: SkillCatalogItem[]
}>()

const emit = defineEmits<{
  toggleSkill: [skillId: string]
}>()

const macroSkills = computed(() => props.skills.filter((skill) => skill.kind === 'macro'))
const nodeSkills = computed(() => props.skills.filter((skill) => skill.kind === 'node'))
const addedSkillIdSet = computed(() => new Set(props.addedSkillIds))

function isSkillAdded(skillId: string) {
  return addedSkillIdSet.value.has(skillId)
}

function toggleSkill(skillId: string) {
  emit('toggleSkill', skillId)
}
</script>

<template>
  <main class="skills-panel" data-testid="skills-panel">
    <header class="skills-header">
      <div class="skills-heading">
        <p class="eyebrow">Global skills</p>
        <h2 class="skills-title">Skills</h2>
      </div>

      <dl class="skills-metrics">
        <div class="skills-metric-card">
          <dt class="skills-metric-label">Added</dt>
          <dd class="skills-metric-value">{{ addedSkillIds.length }}</dd>
        </div>
        <div class="skills-metric-card">
          <dt class="skills-metric-label">Available</dt>
          <dd class="skills-metric-value">{{ skills.length }}</dd>
        </div>
      </dl>
    </header>

    <section class="skill-group" aria-labelledby="macro-skills-heading">
      <div class="skill-group-heading">
        <h3 id="macro-skills-heading">Macro</h3>
        <span>{{ macroSkills.length }}</span>
      </div>

      <ul class="skill-grid">
        <li v-for="skill in macroSkills" :key="skill.id" class="skill-card">
          <div class="skill-card-header">
            <span class="skill-kind">Macro</span>
            <Switch
              :model-value="isSkillAdded(skill.id)"
              :aria-label="`${skill.name} added`"
              @update:model-value="toggleSkill(skill.id)"
            />
          </div>
          <h4 class="skill-name">{{ skill.name }}</h4>
          <p class="skill-description">{{ skill.description }}</p>
          <p class="skill-path">{{ skill.path }}</p>
        </li>
      </ul>
    </section>

    <section class="skill-group" aria-labelledby="node-skills-heading">
      <div class="skill-group-heading">
        <h3 id="node-skills-heading">Node</h3>
        <span>{{ nodeSkills.length }}</span>
      </div>

      <ul class="skill-grid">
        <li v-for="skill in nodeSkills" :key="skill.id" class="skill-card">
          <div class="skill-card-header">
            <span class="skill-kind skill-kind--node">Node</span>
            <Switch
              :model-value="isSkillAdded(skill.id)"
              :aria-label="`${skill.name} added`"
              @update:model-value="toggleSkill(skill.id)"
            />
          </div>
          <h4 class="skill-name">{{ skill.name }}</h4>
          <p class="skill-description">{{ skill.description }}</p>
          <p class="skill-path">{{ skill.path }}</p>
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.skills-panel {
  display: grid;
  height: 100%;
  min-width: 0;
  min-height: 0;
  gap: 1.35rem;
  align-content: start;
  padding: 1.75rem;
  border: 1px solid var(--panel-border);
  border-radius: 1.75rem;
  box-shadow: var(--shadow-soft);
  background: var(--panel-background-simple);
  overflow: auto;
}

.skills-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1.5rem;
}

.skills-heading {
  display: grid;
  gap: 0.7rem;
}

.eyebrow {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.skills-title {
  font-family: var(--font-heading);
  font-size: clamp(2rem, 2.8vw, 2.8rem);
  font-weight: 700;
  line-height: 0.96;
  color: var(--text-primary);
}

.skills-metrics {
  display: flex;
  gap: 0.9rem;
  margin: 0;
}

.skills-metric-card {
  min-width: 5.75rem;
  padding: 0.85rem 1rem;
  border-radius: 0.5rem;
  background: var(--surface-card);
}

.skills-metric-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.skills-metric-value {
  margin: 0.3rem 0 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-primary);
}

.skill-group {
  display: grid;
  gap: 0.85rem;
}

.skill-group-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-secondary);
}

.skill-group-heading h3 {
  font-size: 0.92rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.skill-group-heading span {
  display: inline-flex;
  min-width: 2rem;
  min-height: 2rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--surface-card-soft);
  font-weight: 700;
}

.skill-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
  min-width: 0;
  gap: 0.85rem;
  padding: 0;
  margin: 0;
  list-style: none;
}

.skill-card {
  display: grid;
  min-width: 0;
  min-height: 12rem;
  align-content: start;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid var(--panel-border);
  border-radius: 0.5rem;
  background: var(--surface-card-soft);
}

.skill-card-header {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.skill-kind {
  display: inline-flex;
  align-items: center;
  min-height: 1.7rem;
  padding: 0 0.55rem;
  border-radius: 999px;
  background: var(--accent-warm-soft);
  color: var(--accent-warm-text);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.skill-kind--node {
  background: var(--accent-cool-soft);
  color: var(--accent-cool-text);
}

.skill-name {
  min-width: 0;
  color: var(--text-primary);
  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.skill-description {
  min-width: 0;
  color: var(--text-secondary);
  font-size: 0.92rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.skill-path {
  min-width: 0;
  align-self: end;
  color: var(--text-subtle);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  overflow-wrap: anywhere;
}

@media (max-width: 900px) {
  .skills-header {
    flex-direction: column;
    align-items: start;
  }

  .skills-metrics {
    width: 100%;
  }

  .skills-metric-card {
    flex: 1;
  }
}
</style>
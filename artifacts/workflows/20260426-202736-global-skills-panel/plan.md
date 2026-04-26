# Plan

Workflow ID: 20260426-202736-global-skills-panel
Goal: Add a global skills panel, skill toggles, and node-skill selection in the drawer

## Source User Request

用户希望在左侧新增一个 skills 按钮入口，点击后右侧主区域显示 skills 面板。该 skills 面板是全局视图，不绑定某个 workflow。面板中的 skill 卡片来自项目的 `.github/skills` 目录，并按 `macro` 与 `node` 两类展示；每张卡片包含一个 switch，用于表示是否添加该 skill。节点 drawer 中还要新增一个 select，下拉内容来自用户已添加的 `node` 类型 skill。本次只新增单元测试，不新增 Playwright 测试用例。

## Problem

当前应用只有 workflow 列表、canvas 和 node drawer，没有全局技能库视图，也没有用于把仓库 skill 元数据带入 UI 的数据层。需要新增一个全局 skill catalog 与选择状态，让右侧布局能在 workflow canvas 与 skills 面板之间切换，并让 drawer 只看到已添加的 node skill。

## Scope

1. 新增 skill catalog 解析与分类逻辑，来源为 `.github/skills/*/SKILL.md`。
2. 新增全局 skills 面板入口、技能卡片、macro/node 分类展示和 switch 添加状态。
3. 扩展 workflow studio 状态，使 skills 面板是全局视图，并暴露已添加的 node skills 给 drawer。
4. 在 node drawer 中新增 select 下拉框，展示用户已添加的 node 类型 skill。
5. 新增 Vitest 单元测试覆盖 skill catalog 解析、分类和添加状态逻辑。

## Out of Scope

1. 不新增 Playwright 测试用例。
2. 不实现从 UI 创建、编辑或删除 `.github/skills` 文件。
3. 不把 skill 选择持久化到后端、localStorage 或外部文件。
4. 不改变现有 workflow 创建、切换、节点重命名和 canvas 交互语义。

## Constraints

1. 使用 Vue 3 Composition API 与 `<script setup lang="ts">`。
2. UI 组件优先复用仓库已有 `src/components/ui/` 与 shadcn-vue/reka-ui 风格组件。
3. skill 文件在浏览器中不能运行时读取文件系统，需通过 Vite `import.meta.glob` 在构建时纳入 catalog。
4. `.github/skills` 现有 frontmatter 没有显式 `macro/node` 字段，分类需要使用稳定规则并由单元测试覆盖。
5. drawer 中的 select 只显示用户已添加的 node skills；没有已添加 node skill 时应有明确 disabled/empty 状态。

## Component Reuse Strategy

1. 左侧入口继续复用现有 `Button` 组件，不新增独立导航 primitive。
2. skill 卡片本身属于 feature-specific 展示组件，放在 `src/components/workflow-studio/SkillsPanel.vue`，其中 switch 若仓库无现成组件，则补齐 shadcn/reka 风格的 `src/components/ui/switch` primitive 后复用。
3. drawer select 优先补齐并复用 shadcn/reka 风格的 `src/components/ui/select` primitive，因为当前 `src/components/ui/select` 目录为空且仓库已安装 `reka-ui`。
4. 不自定义通用 Button/Input/Label；继续复用现有 `Button`、`Input`、`Label`。

## Assumptions

1. 用户所说 `/github/skills` 指当前仓库的 `.github/skills` 目录。
2. 缺少显式 skill kind 时，流程编排类 skill 归为 `macro`，技术能力/独立执行节点类 skill 归为 `node`。
3. drawer 中新增 select 的目标是展示和选择已添加 node skill，但本回合不要求把该选择持久化到 workflow 文件或外部存储。

## Open Questions

1. 无。

## Task Breakdown

1. 新增 `src/lib/skills.ts`：解析 SKILL.md frontmatter，生成 skill catalog，分类 `macro/node`，并提供 toggle/added-node-skill 纯函数。
2. 新增单元测试：覆盖 frontmatter 解析、catalog 构建、macro/node 分类、添加/移除 skill、只筛选已添加 node skills。
3. 扩展 `useWorkflowStudio`：维护当前右侧视图、已添加 skill ids、当前 drawer node skill 选择，并暴露切换 skills 面板与 toggle actions。
4. 新增 `SkillsPanel.vue`：展示 macro/node 两组 skill 卡片和 switch；卡片数据来自全局 catalog，不依赖 active workflow。
5. 更新 `WorkflowSidebar.vue` 和 `App.vue`：左侧新增 skills 按钮入口，右侧在 canvas 与 skills 面板之间切换。
6. 补齐 `ui/switch` 与 `ui/select` primitive，并更新 `WorkflowNodeDrawer.vue`：select 仅展示已添加的 node skills，无可用项时禁用。
7. 做窄验证与完整验证：运行新增/现有 Vitest；Testing 阶段仍按 workflow 契约运行 `pnpm test:logic` 与 `pnpm test:ui`，但不新增 Playwright 测试用例。

## Acceptance Criteria

1. 左侧存在 skills 入口，点击后右侧主区域显示全局 skills 面板，而不是某个 workflow 的面板。
2. skills 面板展示来自 `.github/skills` 的 skill 卡片，并按 `macro` 和 `node` 分类。
3. 每张 skill 卡片都有 switch，能反映并切换该 skill 是否已添加。
4. node drawer 新增 select，下拉选项只包含用户已添加的 `node` 类型 skill。
5. 没有已添加 node skill 时，drawer select 显示空状态并不可选。
6. 现有 workflow 创建、切换、节点重命名和 canvas 节点点击打开 drawer 的行为保持不变。
7. 本次不新增 Playwright 测试用例；新增单元测试覆盖核心逻辑。

## Test Strategy

1. 使用 Vitest 为 `src/lib/skills.ts` 的解析、分类和 toggle 逻辑新增单元测试。
2. 继续保留并运行现有 workflow state 单元测试，确保新增状态不破坏现有行为。
3. Coding 阶段不写 Playwright 测试用例；Testing 阶段按标准 workflow 运行全量 `pnpm test:logic` 和 `pnpm test:ui` 作为回归验证。
4. 使用 type/build 检查确认 Vue SFC、Vite raw imports、reka primitives 和 props/emits 合同正确。

## Docs Impact

1. 本回合主要产物记录在 `artifacts/workflows/20260426-202736-global-skills-panel/`。
2. 若最终实现改变长期架构事实，再在 Review 后判断是否需要更新 `ARCHITECTURE.md` 或 README；当前计划不预设文档改动。

## Handoff Notes for Coding

组件边界：`App.vue` 只负责组合 shell 与视图切换；`WorkflowSidebar.vue` 负责左侧 workflow/skills 入口；`SkillsPanel.vue` 负责 skill catalog 的展示和添加状态；`WorkflowNodeDrawer.vue` 只接收已添加 node skills 并发出选择事件；`useWorkflowStudio` 是全局 UI 状态与 workflow 状态的单一来源。数据层先写 `src/lib/skills.ts` 的纯函数和测试，再接入 Vue UI。UI primitive 优先补齐 shadcn/reka 风格的 `Switch` 与 `Select`，不要在 feature 组件里重复实现通用交互。
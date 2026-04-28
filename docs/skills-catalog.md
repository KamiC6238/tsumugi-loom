# Skills Catalog Module

状态：2026-04-29 当前实现基线

文档类型：模块行为文档

## Purpose

Skills Catalog 负责把仓库 `.github/skills` 下的 skill 定义带入前端工作台，并提供全局添加状态和节点 skill 候选列表。它作为全局 catalog 服务 Skills 面板和节点 Drawer。

## Owned Sources

1. `.github/skills/*/SKILL.md`：skill 源文件。
2. `src/lib/skills.ts`：通过 Vite raw import 读取 skill 文件，解析 frontmatter，计算 catalog、macro/node 分类和 added node skills。
3. `src/stores/skills.ts`：Pinia setup store，持有用户已添加的 skill ids，并派生 added skills、added node skills 与添加状态判断。
4. `src/components/workflow-studio/SkillsPanel.vue`：按 macro/node 分组展示 skill 卡片和 Switch。
5. `src/components/workflow-studio/WorkflowNodeDrawer.vue`：展示已添加 node skills 的 Select，并把选择结果交给 workflow 保存逻辑。
6. `src/composables/useWorkflowStudio.ts`：把 skills store 状态和动作接入页面。

## Catalog Contract

1. catalog 来源是 `.github/skills/*/SKILL.md`，由 Vite raw import 纳入浏览器 bundle。
2. skill id 来自目录名，skill 内容来自 `SKILL.md`。
3. frontmatter 中显式声明的 kind/type 会参与 macro/node 分类。
4. 当前只有 `start-standard-workflow` 是默认 macro；其他未显式声明 kind/type 的 skills 默认归为 node。
5. catalog 按 macro skills 和 node skills 两类供 UI 展示。
6. toggle 请求只接受 catalog 中已知的 skill id。

## User-Facing Contract

1. Sidebar 的 Skills 入口打开全局 Skills 面板，并关闭当前节点 Drawer。
2. Skills 面板按 macro/node 分类展示 catalog 中的 skill。
3. 每张 skill 卡片通过 Switch 表示添加状态；用户切换 Switch 后，由 Pinia skills store 更新 added skill ids。
4. Skills 面板是全局面板；切换添加状态会更新全局 added skill ids。
5. 节点 Drawer 只展示已经添加的 node skills。
6. 保存节点时，节点 skill assignment 使用 node skill。

## State Model

1. `useSkillsStore` 持有 `addedSkillIds`。
2. `addedSkills` 从 catalog 和 `addedSkillIds` 派生。
3. `addedNodeSkills` 只包含已经添加且分类为 node 的 skills。
4. `isSkillAdded(skillId)` 用于 Skills 面板渲染 Switch 状态。
5. added skill ids 当前保存在 Pinia 会话状态中。

## Data Flow

1. `src/lib/skills.ts` 在构建时通过 raw import 收集 `.github/skills/*/SKILL.md`。
2. parser 提取 frontmatter 和正文，并形成 normalized skill catalog。
3. `useSkillsStore` 读取 catalog，维护 added skill ids。
4. `useWorkflowStudio` 将 catalog、addedSkillIds、addedNodeSkills、isSkillAdded 和 toggleSkill 下发给 UI。
5. `SkillsPanel` 发出 toggle 意图，状态更新由 store 执行，catalog 来源保持稳定。
6. `WorkflowNodeDrawer` 接收 `addedNodeSkills` 作为 Select options，并在保存时把选中的 node skill id 交回 workflow 模块。

## Integration Points

1. 与 Workflow Studio 的交点是 Drawer 的 node skill options 和节点保存规则。
2. 与 Project Structure 的交点是 `.github/skills` 目录约定。
3. 与 Validation Map 的交点是 catalog parser、store 派生状态和 UI 文本 containment 测试。

## Validation Basis

1. `tests/logic/skills.test.ts` 覆盖 catalog 载入、frontmatter 解析、macro/node 分类与 added node skill 过滤。
2. `tests/logic/skills-store.test.ts` 覆盖 Pinia skills store 的添加状态、未知 skill 防护与 added node skills 派生。
3. `tests/logic/workflow-studio.test.ts` 覆盖页面级 composable 如何接入 Pinia skill 添加状态和节点 skill 保存规则。
4. `tests/logic/workflow-ui.test.ts` 覆盖 SkillsPanel 和 Drawer 的组件级接线。
5. `tests/ui/workflow-sidebar.spec.ts` 覆盖 skill 卡片文本 containment 和 added node skill select 交互。

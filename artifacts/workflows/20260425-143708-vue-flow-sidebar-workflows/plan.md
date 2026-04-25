# Plan

Workflow ID: 20260425-143708-vue-flow-sidebar-workflows
Goal: 基于 vue-flow 构建左右布局 workflow 页面，支持 sidebar 常驻 create、多 workflow 创建与切换。

## Source User Request

用户希望在当前 Vue 3 前端探索项目中做一个新的 workflow 管理页面，使用左右布局。左侧是 sidebar，默认常驻一个 create 按钮；点击后打开弹窗，输入 workflow name 并保存。保存成功后，右侧区域显示对应的 vue-flow 画布。sidebar 需要持续保留 create 按钮，并允许用户创建多个 workflow、在它们之间切换。

## Problem

当前应用仍停留在 Vite 默认模板，没有任何 workflow 管理界面、创建流程或 vue-flow 画布接入。需要在单页应用内建立最小但完整的多 workflow 管理体验，同时给 workflow 创建/切换行为提供可回归的验证。

## Scope

1. 替换当前首页为左右布局的 workflow 管理页，左侧展示应用标题、说明、常驻 create 按钮和 workflow 列表。
2. 提供创建 workflow 的模态弹窗，支持输入名称、校验空值、保存后生成新 workflow 并自动切换到它。
3. 在右侧为当前选中的 workflow 渲染 vue-flow 画布，并为不同 workflow 提供独立标题和示例节点/边。
4. 为 workflow 创建与切换逻辑补充高价值逻辑测试，为关键 UI 行为补充 Playwright 测试。

## Out of Scope

1. 持久化 workflow 到本地存储或后端。
2. 真实业务节点编辑器、复杂节点类型、边编辑或画布保存。
3. Sidebar 拖拽排序、删除 workflow、重命名 workflow。

## Constraints

1. 保持当前仓库作为浏览器端单页应用，不引入服务端或额外状态管理库。
2. 使用现有依赖中的 vue-flow，遵循其基本样式导入和容器高度要求。
3. 遵守当前标准 workflow 协议，产出 plan、coding、testing、review artifacts。

## Assumptions

1. 每个新建 workflow 在本轮只需要一组示例节点和边即可满足“右侧显示 vue-flow”的要求。
2. 模态弹窗可使用轻量自实现覆盖层，不强制接入新的 UI 组件封装。
3. 当前全量测试集以本轮新增的 logic 和 ui 测试为主，可以直接通过 pnpm 脚本执行。

## Open Questions

1. 无。

## Task Breakdown

1. 设计 workflow 数据模型与创建/选中逻辑，提炼可测试的纯函数帮助实现多 workflow 管理。
2. 重写顶层页面，加入 sidebar、create 模态、workflow 列表和右侧条件渲染的 vue-flow 画布。
3. 为 workflow 管理逻辑编写 Vitest 测试，为创建和切换的核心用户路径编写 Playwright 测试。
4. 执行构建、logic 测试、ui 测试和全量测试，记录结果并完成 review 阶段交接。

## Acceptance Criteria

1. 初始页面显示 sidebar 和 create 按钮，未创建 workflow 时右侧出现明确的空状态提示。
2. 点击 create 后出现弹窗；输入非空 workflow name 并点击 save，会在 sidebar 增加一个新 workflow，并自动切换为选中状态。
3. 创建至少两个 workflow 后，用户可以从 sidebar 切换不同 workflow，右侧标题和 vue-flow 画布内容随之更新。
4. 逻辑测试覆盖 workflow 创建与切换规则，UI 测试覆盖创建和切换的关键交互路径。

## Test Strategy

1. 为 workflow 数据模型提供 Vitest 逻辑测试，验证初始状态、创建后自动选中、切换保留独立节点数据等行为。
2. 使用 Playwright 覆盖空状态、打开模态、保存 workflow、sidebar 切换和右侧画布更新。
3. 运行 pnpm build、pnpm test:logic、pnpm test:ui 和 pnpm test:all 作为阶段验证。

## Docs Impact

1. 无需更新 canonical docs；本轮事实主要落在 workflow artifacts。
2. 若 review 中发现需要沉淀的仓库约束，再决定是否追加 repo memory 或 docs follow-up。

## Relevant Knowledge Base Slices

- [x] ARCHITECTURE.md

## Handoff Notes for Coding

优先先抽出 workflow 状态构造和切换逻辑，再接到 App 页面，避免把数据生成规则硬编码进模板分支。UI 上只实现本轮需求必需的创建、选择和画布展示；不做持久化和复杂节点编辑。测试先覆盖纯逻辑，再用 Playwright 验证关键用户路径，确保后续 review 能直接基于 artifact 和测试结果判断是否通过。
# Plan

Workflow ID: 20260430-080218-knowledge-base-update-from-runs
Goal: 为 issue Run 增加从执行产物提炼业务事实并写回目标仓库 Knowledge base 的能力

## Source User Request

用户希望 Tsumugi Loom 作为一个可接入其他 GitHub 仓库的平台，不只执行 issue workflow，还能在执行完成后沉淀项目知识。具体交互是在 issue 列表页为已完成执行的 issue 提供“更新 Knowledge base”按钮。用户点击后，平台从该 issue 的执行结果中读取 plan、test case、代码变更等产物，提取出对项目长期有价值的业务事实。平台需要把这些事实写入用户当前选择的项目仓库中的文档；如果文档已经存在，则更新这个文档，而不是每次生成孤立副本。

## Problem

当前项目已经支持选择 GitHub repository、展示 open issues、在 issue detail 中提交 workflow Run，并由本地 Copilot runner 生成 `artifacts/runs/<run-id>/` 执行产物。但应用还没有按 issue 追踪“最近一次完成的 run”、没有在 issue 列表暴露 knowledge base 更新入口，也没有 runner 端的安全写文件接口。另一个关键边界是：当前 `GithubRepository` 只保存 GitHub remote 元数据，浏览器并不可靠持有可写的本地仓库路径；因此写入用户项目仓库的文档应由本地 runner 负责，并且 UI 需要确认 runner 绑定的本地仓库与当前选中的 GitHub repository 匹配。

## Scope

1. 在前端模型中记录 issue 与 workflow run 的关联，让 issue 列表能知道某个 issue 是否有可用于知识库更新的已完成 run。
2. 在 Tasks issue 列表页为符合条件的 issue 增加“更新 Knowledge base”按钮，并展示更新中的、成功、失败和不可用状态。
3. 新增 Knowledge Base 更新的纯逻辑与 Pinia store，负责 readiness 判断、请求 payload、提交状态和错误归一化。
4. 扩展本地 runner endpoint：接收指定 run 的 knowledge base 更新请求，校验 run 已完成，读取 run artifact、节点结果和节点声明的 artifacts。
5. 由 runner 在目标仓库中创建或更新固定文档 `docs/knowledge-base.md`；如果目标文件已存在，应基于现有内容合并更新。
6. 提取来源至少覆盖 issue snapshot、workflow snapshot、node-result、plan/test/report/code-change 类 artifact，以及可用的代码变更摘要。
7. 为 runner 增加目标仓库身份/status 能力，供 UI 判断当前 selected repository 是否与 runner repo 一致。
8. 更新长期文档，说明 Knowledge Base 更新的用户契约、runner 契约、artifact 约定和验证入口。

## Out of Scope

1. 不在本轮实现自动触发；第一版保持用户在 issue 列表手动点击“更新 Knowledge base”。
2. 不实现远程服务、多租户 runner、云端写文件或 GitHub App 权限模型。
3. 不在本轮自动 commit、push、创建 PR 或关闭 issue；只更新用户本地选择仓库中的文档。
4. 不实现可配置的知识库文档路径；第一版固定为 `docs/knowledge-base.md`。
5. 不把本功能做成当前仓库内部已废弃的 generated run knowledge 流程；本轮是平台面向目标仓库的产品能力。
6. 不承诺从失败 run 中提取事实；第一版只允许从 completed run 生成或更新文档。

## Constraints

1. 浏览器不能稳定、跨浏览器地写入用户任意本地仓库文件；文档写入必须走本地 runner。
2. runner 必须把写入路径限制在目标 repo root 内，禁止 path traversal 或用户传入任意绝对路径。
3. Knowledge Base 更新前，UI 必须确认 runner 绑定的 repository full name 与 Tasks 当前 selected repository 一致；不一致时按钮不可执行并显示原因。
4. 知识库文档应记录稳定业务事实，避免把日志、临时调试过程、模型自述或单次执行噪音写入长期文档。
5. 更新已有文档时要尽量保留用户手写内容；平台管理内容应有明确标题或 marker，避免覆盖整份文档。
6. Copilot/LLM 生成内容不可作为唯一成功信号；runner 需要校验目标文档存在、可读写，并写出本次 update artifact 供追踪。
7. 现有 UI 以紧凑工作台为主，新增按钮和状态不能破坏 issue card 的扫描效率。

## Component Reuse Strategy

1. Issue 列表按钮继续复用 `src/components/ui/button`，图标优先从 `lucide-vue-next` 选择，例如 `BookOpenCheckIcon`、`FileTextIcon` 或 `RefreshCwIcon`。
2. Knowledge Base 状态展示复用 TasksPanel 现有紧凑状态文本/状态条风格，不新增基础 UI primitive。
3. 如果需要在 issue card 内阻止按钮点击打开 issue detail，直接在现有 card markup 上处理事件传播，不新增自定义 card 组件。
4. 复杂逻辑放入 `src/lib/knowledgeBase.ts` 和 `src/stores/knowledgeBase.ts`，TasksPanel 只做状态接线和事件派发。

## Assumptions

1. 用户会以目标项目仓库作为 runner 的 `--repo` 启动目录，或后续 runner status 能明确暴露当前 repo identity。
2. 已完成 run 的 `artifactDir` 可由 runner 解析到本地 `artifacts/runs/<run-id>/` 目录。
3. 节点执行会尽量在 `node-result.json.artifacts` 中声明 plan、test case、test report、code-change 或 review 等相关文件；如果声明缺失，runner 可以退回扫描 run artifact 的标准位置。
4. 第一版目标文档为 `docs/knowledge-base.md`，如果 `docs/` 不存在由 runner 创建。
5. Knowledge Base 更新可以使用一段 runner 内置的 reconciliation prompt 或平台内置 skill 指令；目标仓库不需要自己安装 `.github/skills/docs-reconciler`。
6. 生成文档的语言先跟随目标仓库已有 `docs/knowledge-base.md`，新建时可默认使用中文，后续再做配置。

## Open Questions

1. 后续是否需要允许用户配置 Knowledge Base 文档路径；本轮先固定 `docs/knowledge-base.md`。
2. 后续是否需要在更新文档后自动提交 Git commit 或创建 PR；本轮只写入本地工作区。
3. 后续是否要把 issue body/comments 拉入知识提取输入；本轮先基于当前 issue snapshot 与 run artifacts。

## Task Breakdown

1. 定义 Knowledge Base 领域模型：新增 `src/lib/knowledgeBase.ts`，包含 update readiness、request payload、runner status/repository match 判断、默认文档路径常量和错误消息归一化。
2. 扩展 workflow run 状态：让 `useWorkflowRunsStore` 记录 issue number 到 latest run submission 的映射，并支持查询/刷新单个 run 状态，必要时通过 runner `GET /runs/:runId` 轮询到 completed/failed。
3. 新增 `src/stores/knowledgeBase.ts`，以 issue number + run id 作为 key 管理 `idle | updating | updated | error` 状态、最近更新结果、错误信息和 submit action。
4. 扩展 runner status：为 `scripts/loom/copilot-runner.mjs` 增加 `GET /status`，返回 runner repo path、repository fullName、mode 和可用能力；repo fullName 通过目标 repo 的 `.git/config` 解析。
5. 扩展 runner knowledge endpoint：新增 `POST /runs/:runId/knowledge-base` 或等价 endpoint，校验 run 存在且已 completed，收集 run 输入、node-result、节点 artifact、必要的 git diff/代码变更摘要，并生成本次 knowledge update artifact。
6. 实现文档创建/更新：runner 在目标仓库内创建或更新 `docs/knowledge-base.md`，使用明确的平台管理 section 或 metadata marker，避免覆盖非管理内容；完成后返回 target path、fact count、source artifact 列表和 update artifact path。
7. 接入 TasksPanel issue 列表：在 issue card 上显示“更新 Knowledge base”按钮；仅当 issue 有 completed run、runner repo 匹配、当前没有更新中任务时启用；点击按钮时阻止打开 issue detail。
8. 在 issue detail 保持现有 Run 体验，同时在 Run 成功完成后让 issue 列表能看到该 run 可用于 Knowledge Base 更新。
9. 增加 Vitest 覆盖：`knowledgeBase` 纯逻辑、knowledge base store 成功/失败、workflow run per-issue 状态、TasksPanel 按钮启用/禁用和状态展示。
10. 增加 runner 脚本测试：dry-run 创建新 `docs/knowledge-base.md`、更新已有文档、拒绝未完成/失败 run、拒绝 runner repo mismatch 或非法路径，并验证 update artifact 写入。
11. 更新文档：`README.md`、`ARCHITECTURE.md`、`docs/github-tasks.md`、`docs/project-structure.md`、`docs/validation-map.md`，必要时新增 `docs/knowledge-base-updates.md` 作为模块行为文档。

## Acceptance Criteria

1. issue workflow Run 完成后，用户回到 issue 列表能在对应 issue card 上看到“更新 Knowledge base”按钮。
2. 没有 completed run、runner 未启动、runner repo 与 selected repository 不匹配、或上一次 run 失败时，按钮不可执行，并能看到简短原因。
3. 点击“更新 Knowledge base”后，前端向本地 runner 提交 knowledge base 更新请求，并在 issue card 上展示 updating、updated 或 error 状态。
4. runner 会从 completed run artifact 中读取 issue、workflow、node-result 和 plan/test/code-change 类产物，生成本次 knowledge update artifact。
5. 如果目标仓库不存在 `docs/knowledge-base.md`，runner 会创建它；如果已经存在，runner 会更新该文档而不是生成重复副本。
6. 多次对同一个 run 点击更新时，文档不会无限重复同一批事实；更新逻辑应基于 issue/run metadata 或 managed section 做幂等合并。
7. 写入路径始终限制在 runner 绑定的目标仓库内，并返回相对路径 `docs/knowledge-base.md` 给前端展示。
8. 新增逻辑测试和 runner contract 测试通过，现有 GitHub Tasks、workflow run 和 UI 测试保持通过。

## Test Strategy

1. 用 Vitest 覆盖 `src/lib/knowledgeBase.ts`：runner repository match、completed run readiness、默认 target path、不可用原因和 payload 生成。
2. 用 Vitest 覆盖 `src/stores/knowledgeBase.ts`：提交成功、runner error、网络错误、重复点击防护、per issue/run 状态隔离。
3. 扩展 `tests/logic/workflow-runs-store.test.ts`：验证 latest run 能按 issue number 查询，run status refresh 不覆盖其他 issue。
4. 扩展 `tests/logic/workflow-ui.test.ts`：验证 issue list 的“更新 Knowledge base”按钮显示、禁用原因、点击不会打开 issue detail，以及成功/失败状态文案。
5. 扩展 `tests/logic/copilot-runner-script.test.ts`：使用 dry-run 或 fake Copilot 覆盖新建/更新 knowledge base 文档、拒绝未完成 run、路径安全和 update artifact 输出。
6. 完成实现后运行 `pnpm test:logic` 和 `pnpm build`；如果 issue card 真实交互或布局明显变化，再运行 `pnpm test:ui`。

## Docs Impact

1. `ARCHITECTURE.md` 增加 Knowledge Base Update 作为 GitHub Tasks / Workflow Runs / runner 的跨模块能力，并更新文档路由表。
2. `docs/github-tasks.md` 增加 issue 列表按钮、completed run readiness、runner repo match 和用户可见状态契约。
3. `docs/project-structure.md` 增加目标仓库 `docs/knowledge-base.md` 约定和 runner knowledge update artifact 约定。
4. `docs/validation-map.md` 增加 knowledge base 逻辑、store、UI 和 runner contract 测试归属。
5. `README.md` 的 Current Capabilities 在实现完成后补充“从 issue Run 结果更新目标仓库 Knowledge Base”。
6. 若新增 `docs/knowledge-base-updates.md`，需要在 `ARCHITECTURE.md` 和 `docs/project-structure.md` 中登记文档职责。

## Handoff Notes for Coding

优先实现纯逻辑和 runner contract，再接入 store 与 UI。文件写入必须放在本地 runner，不要让浏览器直接写目标仓库；前端只提交 run id、issue snapshot 和 selected repository identity。UI 继续复用现有 shadcn-vue Button 和 TasksPanel 紧凑布局，按钮文案使用用户指定的“更新 Knowledge base”。实现时不要复活当前仓库内部已废弃的 generated run knowledge 流程；这是面向用户选择仓库的 Knowledge Base 产品能力。第一版固定写 `docs/knowledge-base.md`，并通过 runner repo status 防止把文档写到错误仓库。
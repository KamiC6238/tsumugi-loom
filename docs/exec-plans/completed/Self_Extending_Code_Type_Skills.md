# Self-Extending Code-Type Skills Workflow

## Goal

在 Agent 执行流中引入"按代码类型加载对应 skill"机制，若 skill 不存在则由 Agent 自行创建后再使用，从而实现可自增长的规范体系。

## Branch

feat/self-extending-code-type-skills

## Context

当前模板的 Agent 执行流读完 ARCHITECTURE.md 后直接进入计划草拟阶段，缺少"先理解目标代码的类型，再加载对应编码规范"的门控。同时，ARCHITECTURE.md 没有对目录进行类型分类，Agent 无法自动判断目标目录属于哪种代码类型（业务组件 / 工具函数 / 类型定义 / API 层等）。

用户补充：预定义的分类不必穷举。Agent 遇到未知类型时，应当自行创建新的目录分类条目和对应的 code-type skill，完成 bootstrap 后再继续。

## Scope

In scope:
- `docs/ARCHITECTURE.md` 增加 `Directory Classification` 模板章节
- 新建 `.github/skills/code-type-routing/SKILL.md`（含自增长逻辑）
- `execution-planning` SKILL 在 Step 3 之后插入 Step 3.5：Code-Type Skill 门控
- `doc-update-routing` SKILL 末尾增加：检查受影响的 code-type skill 是否需要同步更新
- `AGENTS.md` 注册新 skill
- `docs/GOLDEN_RULES.md` 增加"写代码前必须加载 code-type skill"规则
- `scripts/check-doc-updates.config.js` 为新 skill 路径补充路由条目
- `tests/check-doc-updates.test.js` 为新路由补充测试用例

Out of scope:
- 具体业务项目的 code-type skill 内容（由各项目自行填写）
- 强制校验 ARCHITECTURE.md 是否包含 Directory Classification 的 lint 脚本

## Steps

### Step 1: 为 ARCHITECTURE.md 增加 Directory Classification 模板章节

Red:
- [ ] 在 `tests/check-doc-updates.test.js` 追加一个测试：读取 `docs/ARCHITECTURE.md` 并断言其包含 `## Directory Classification` 标题。
- [ ] 运行 `node --test tests/check-doc-updates.test.js` 并确认新测试以"missing section"失败。

Green:
- [ ] 在 `docs/ARCHITECTURE.md` 末尾追加 `## Directory Classification` 章节，包含分类类型说明与示例表格模板。
- [ ] 重新运行 `node --test tests/check-doc-updates.test.js` 并确认新测试通过。

Refactor:
- [ ] 确保章节措辞与现有文档风格一致（简洁、面向 Agent 指令化）。
- [ ] 重新运行 `node --test tests/check-doc-updates.test.js` 确认保持绿色。

### Step 2: 创建 code-type-routing SKILL.md（含 Bootstrap 逻辑）

Red:
- [ ] 在 `tests/check-doc-updates.test.js` 追加测试：断言 `.github/skills/code-type-routing/SKILL.md` 文件存在。
- [ ] 运行 `node --test tests/check-doc-updates.test.js` 确认新测试失败（文件不存在）。

Green:
- [ ] 创建 `.github/skills/code-type-routing/SKILL.md`，包含：
  - 读 ARCHITECTURE.md Directory Classification 节的步骤
  - 按目标文件路径匹配目录类型的规则
  - 若找到对应 skill 则加载它
  - 若无对应 skill 则 **Bootstrap 流程**：创建新分类条目 + 创建新 skill 框架 + 再加载
- [ ] 重新运行 `node --test tests/check-doc-updates.test.js` 确认测试通过。

Refactor:
- [ ] 审查 Bootstrap 流程，确保步骤描述足够具体，Agent 不需猜测即可执行。
- [ ] 重新运行 `node --test tests/check-doc-updates.test.js` 确认保持绿色。

### Step 3: 在 execution-planning SKILL 中插入 Code-Type 门控步骤

Red:
- [ ] 在 `tests/check-doc-updates.test.js` 追加测试：读取 `.github/skills/execution-planning/SKILL.md` 并断言包含 `code-type-routing` 引用。
- [ ] 运行 `node --test tests/check-doc-updates.test.js` 确认新测试失败。

Green:
- [ ] 在 `execution-planning` SKILL.md 的 Step 3（Gather Required Context）之后插入 **Step 3.5: Identify Code-Type And Load Skill**，要求读完 ARCHITECTURE Directory Classification 后通过 `code-type-routing` skill 加载对应 code skill，完成后才继续 Step 4。
- [ ] 重新运行 `node --test tests/check-doc-updates.test.js` 确认测试通过。

Refactor:
- [ ] 检查步骤编号连续性和措辞与其他步骤风格对齐。
- [ ] 重新运行 `node --test tests/check-doc-updates.test.js` 确认保持绿色。

### Step 4: 在 doc-update-routing SKILL 中增加 code-type skill 同步检查

Red:
- [ ] 在 `tests/check-doc-updates.test.js` 追加测试：读取 `.github/skills/doc-update-routing/SKILL.md` 并断言包含 `code-type` 相关检查步骤。
- [ ] 运行 `node --test tests/check-doc-updates.test.js` 确认新测试失败。

Green:
- [ ] 在 `doc-update-routing` SKILL.md 末尾增加 **Step N: Check Affected Code-Type Skills**，指导 Agent 检查此次代码变更是否使某个已有的 code-type skill 内容过时，若是则同步更新。
- [ ] 重新运行 `node --test tests/check-doc-updates.test.js` 确认测试通过。

Refactor:
- [ ] 确保新步骤与现有路由步骤格式一致。
- [ ] 重新运行 `node --test tests/check-doc-updates.test.js` 确认保持绿色。

### Step 5: 更新 AGENTS.md 与 GOLDEN_RULES.md

Red:
- [ ] 在 `tests/check-doc-updates.test.js` 追加测试：读取 `AGENTS.md` 断言包含 `code-type-routing` 条目；读取 `docs/GOLDEN_RULES.md` 断言包含 code-type skill 加载规则。
- [ ] 运行 `node --test tests/check-doc-updates.test.js` 确认新测试失败。

Green:
- [ ] 在 `AGENTS.md` 的 Available Skills 列表中注册 `code-type-routing` skill。
- [ ] 在 `docs/GOLDEN_RULES.md` 增加规则："写代码前必须通过 code-type-routing skill 加载对应 code-type skill；若 skill 不存在则先 bootstrap 再使用"。
- [ ] 重新运行 `node --test tests/check-doc-updates.test.js` 确认测试通过。

Refactor:
- [ ] 确认 AGENTS.md skill 列表描述与其他条目格式一致。
- [ ] 重新运行 `node --test tests/check-doc-updates.test.js` 确认保持绿色。

### Step 6: 更新路由配置与配套测试

Red:
- [ ] 在 `tests/check-doc-updates.test.js` 追加测试：传入 `.github/skills/code-type-routing/SKILL.md` 作为变更文件，断言 `getRequiredDurableDocs` 返回包含 `docs/GOLDEN_RULES.md` 和 `docs/PROJECT_OPERATIONS.md`。
- [ ] 运行 `node --test tests/check-doc-updates.test.js` 确认新测试失败（路由规则尚未覆盖新路径）。

Green:
- [ ] 确认 `scripts/check-doc-updates.config.js` 中现有的 `.github/skills/.+/SKILL.md` 正则已覆盖新 skill 路径（验证正则是否匹配 `code-type-routing`），若已覆盖则测试应直接绿。
- [ ] 若未覆盖，调整正则或追加专项路由。
- [ ] 重新运行 `node --test tests/check-doc-updates.test.js` 确认测试通过。

Refactor:
- [ ] 运行完整测试套件 `node --test tests/` 确认所有测试绿色。
- [ ] 运行 `node scripts/check-docs-freshness.js` 和 `node scripts/check-docs-consistency.js` 确认无报错。

## Current State

phase: done
step: 6
checkpoint: 2026-04-24T00:00:00Z

## Checkpoint Context

- Last action: 所有 6 步完成，测试 14/14 通过，freshness 和 consistency 检查通过
- Blocking: none
- Resume instruction: 运行 node scripts/migrate-completed-plans.js 迁移计划文件

## Decisions

- Decision: 将目录分类以模板章节形式放在 ARCHITECTURE.md 而非单独文件
  Rationale: ARCHITECTURE.md 已是全局地图，分类信息放在同一文件减少跳转层次，且各项目 fork 后可直接在原地填写。
- Decision: code-type-routing skill 内置 Bootstrap 流程而非拆分为独立 skill
  Rationale: Bootstrap 是路由失败后的内联兜底路径，不是独立场景，拆分会增加 Agent 的跳转成本。
- Decision: doc-update-routing 而非新建 skill 来覆盖 code-type skill 同步检查
  Rationale: code-type skill 同步属于"实现完成后更新文档"的范畴，与 doc-update-routing 的职责完全一致，不值得新增 skill。

## Progress

- [x] Step 1 - ARCHITECTURE Directory Classification 章节
- [x] Step 2 - code-type-routing SKILL.md 创建
- [x] Step 3 - execution-planning Code-Type 门控
- [x] Step 4 - doc-update-routing code-type skill 同步检查
- [x] Step 5 - AGENTS.md 与 GOLDEN_RULES.md 更新
- [x] Step 6 - 路由配置与测试

## Validation

- `node --test tests/check-doc-updates.test.js` — 14 tests pass
- `node scripts/check-docs-freshness.js` — no errors
- `node scripts/check-docs-consistency.js` — no errors

## Notes

- 2026-04-24: 用户强调分类不必穷举，Agent 遇到未知类型时应自行 bootstrap 新分类和 skill，再继续。Bootstrap 逻辑必须在 code-type-routing SKILL.md 中写得足够清晰可执行。

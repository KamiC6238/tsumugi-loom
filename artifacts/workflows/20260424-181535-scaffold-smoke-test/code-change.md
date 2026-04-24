# Code Change Artifact

Workflow ID: 20260424-181535-scaffold-smoke-test

## Files Changed

1. package.json
	新增 workflow 自动化命令入口。
2. ARCHITECTURE.md 与 docs 下的 canonical docs
	落地 knowledge base 的最小骨架。
3. scripts/loom/
	新增 start、validate、reconcile 脚本及共享逻辑。
4. artifacts/workflows/README.md 与 docs/process/WORKFLOW_AUTOMATION.zh-CN.md
	固化目录约定和使用方式。

## Behavioral Changes

1. 开发回合现在可以通过脚本生成标准 artifacts。
2. 未完成的模板会被 validate 阻止。
3. 补齐 artifacts 后可以生成 run knowledge 和 reconciliation 报告。

## Implementation Notes

1. reconcile 只生成候选文档，不自动写回 canonical docs。
2. workflow id 使用本地时间戳和 slug 组合，便于人工检索。
3. 参数解析显式兼容 pnpm 传入的 `--` 分隔符。

## Follow-up Risks

1. 目前没有 schema 级严格校验 markdown 内容完整性。
2. 当前流程仍依赖人工决定哪些候选事实应进入 canonical docs。

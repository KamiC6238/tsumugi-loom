# Test Report Artifact

Workflow ID: 20260424-184331-one-shot-smoke

## Commands Run

1. pnpm loom:workflow:validate -- 20260424-184331-one-shot-smoke

## Results

预期结果是 validate 失败，但失败原因应只来自 needs_clarification gate，而不是 schema、缺文件或模板占位问题。

## Coverage Gaps

本样例不覆盖 reconcile，也不覆盖从 open 到 resolved 的完整澄清闭环。

# Code Review Checklist

在 Review 阶段，优先检查这些高价值点：

1. 实现是否真的满足 plan、task breakdown 和 acceptance criteria。
2. 是否遗漏失败路径、边界条件、空值场景或状态回滚。
3. 改动是否引入 contract drift，例如数据结构、命名、流程语义和 artifact 约定变化。
4. 错误处理、输入校验和资源清理是否足够。
5. 测试是否覆盖了真正变化的行为，并通过断言表达可见结果。
6. 文档、knowledge delta 和实际实现是否一致。
7. 是否引入了会放大后续维护成本的复杂度或隐性耦合。

如果这些点存在未解决问题，reviewer 应返回 `changes_requested`。
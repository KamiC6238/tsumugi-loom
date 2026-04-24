# Generated Run Knowledge

这个目录承接每次 workflow 结束后的整理结果。

它的作用是：

1. 保留本次运行摘要。
2. 建立 artifacts 索引。
3. 记录 knowledge delta。
4. 标出待确认结论。
5. 给 canonical docs 提供受控更新输入。

这里的内容不是 canonical docs。

Docs Reconciler 会先在这里沉淀运行知识，再把适合入库的事实按 target-scoped 方式写入：

1. ARCHITECTURE.md
2. docs/CONVENTIONS.md
3. docs/DOMAIN.md
4. docs/decisions/

因此 generated run knowledge 仍然是独立层：

1. 它保留完整运行摘要和证据索引。
2. 它不是 canonical docs 本身。
3. canonical docs 只吸收其中已经验证、值得长期保留的事实。
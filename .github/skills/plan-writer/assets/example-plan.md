# Plan

Workflow ID: 20260424-000000-homepage-overview
Goal: 搭建首页说明页并梳理 Tsumugi Loom 的核心信息结构

## Source User Request

用户希望先做一个首页说明页，用来表达 Tsumugi Loom 的产品定位和核心原则。当前不需要节点 UI，不接后端，也不引入真正的 graph runtime。改动应尽量限制在前端展示层和相关文档说明。

## Problem

当前项目缺少一个能清楚表达产品定位和方法论的首页壳层，导致后续设计和沟通没有稳定落点。

## Scope

1. 新增首页说明页的信息结构。
2. 展示产品定位、核心原则和 MVP 边界。
3. 只修改前端展示层和必要文档。

## Out of Scope

1. 不实现真实的节点编排 runtime。
2. 不接入后端或数据持久化。
3. 不实现交互式 graph UI。

## Constraints

1. 必须保持当前 Vue/Vite 技术栈。
2. 保持已有 workflow automation 文档和目录约定。

## Assumptions

1. 当前阶段首页以静态内容为主即可。
2. 产品说明文案可以先基于现有讨论稿整理。

## Open Questions

1. 无阻塞问题；后续如果需要多语言支持，可单独开新 workflow。

## Task Breakdown

1. 提炼首页需要表达的核心信息模块。
2. 调整页面壳层和组件结构以承载这些信息。
3. 补充必要样式和文案。
4. 验证页面在桌面和移动端都可读。

## Acceptance Criteria

1. 首页能清楚展示产品定位、核心原则和 MVP 范围。
2. 改动只影响前端展示层和必要说明文档。
3. 页面在主要视口下无明显布局问题。

## Test Strategy

1. 运行前端构建命令确认通过。
2. 在本地预览页面并检查布局和信息层级。

## Docs Impact

1. 可能更新 docs/DOMAIN.md 中的产品表达。
2. 如形成稳定信息架构，可在 generated run knowledge 中沉淀总结。

## Relevant Knowledge Base Slices

- [x] ARCHITECTURE.md

## Handoff Notes for Coding

Coding 应优先解决信息结构和页面可读性，并将本轮工作集中在展示层与必要文档。
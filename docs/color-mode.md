# Color Mode Module

状态：2026-04-29 当前实现基线

文档类型：模块行为文档

## Purpose

Color Mode 负责应用的 light/dark 主题偏好。它是独立的 UI 偏好模块，和 workflow、skills、GitHub tasks 业务状态分别管理。

## Owned Sources

1. `src/composables/useColorMode.ts`：颜色模式组合逻辑，读取和写入 localStorage，并同步 document root。
2. `src/main.ts`：应用挂载前初始化颜色模式。
3. `src/style.css`：light/dark 语义视觉变量，以及 Tailwind、shadcn-vue 和 Vue Flow 基础样式引入。
4. `src/components/workflow-studio/ThemeModeToggle.vue`：Sidebar 品牌区的主题切换按钮。

## User-Facing Contract

1. Sidebar 品牌区展示颜色模式切换按钮。
2. 用户点击按钮后，在 light 和 dark 之间切换。
3. 当前颜色模式会立即应用到页面视觉变量和浏览器 `color-scheme`。
4. 刷新页面后恢复上次保存的颜色偏好。
5. 按钮的 aria label 和图标会反映当前可执行的切换动作。

## State And Storage

1. 颜色模式只允许 `light` 和 `dark`。
2. localStorage key 是 `tsumugi-loom-color-mode`。
3. 初始化时读取 localStorage；空值或异常值使用默认模式。
4. 切换后写回 localStorage。
5. 当前模式会同步到 document root 的 `dark` class、`data-color-mode` attribute 和 `color-scheme` style。

## Data Flow

1. `src/main.ts` 在应用挂载前调用颜色模式初始化逻辑，确保初始渲染主题一致。
2. `useColorMode()` 暴露当前 mode 和 toggle 动作。
3. `ThemeModeToggle` 通过 composable 读取模式并触发切换。
4. composable 写入 localStorage，并更新 document root。
5. `src/style.css` 根据根元素状态应用 light/dark 语义变量。

## Integration Points

1. 与 Workflow Studio 的交点是 Sidebar 品牌区组件位置。
2. 与 UI primitives 的交点是 Button 样式和 icon button 可访问性。
3. 与 Vue Flow 的交点是全局样式变量影响画布周边视觉，画布数据由 Workflow Studio 管理。

## Validation Basis

1. `tests/logic/color-mode.test.ts` 覆盖 localStorage 初始化、切换持久化、document root 同步，以及 Sidebar 品牌区按钮的图标和 aria label。
2. `pnpm build` 覆盖相关 TypeScript 类型约束和 Vue SFC 构建。

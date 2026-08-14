# DeepSeek Harness Token 活动插件

> 面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的**独立第三方纯插件**：以 GitHub 贡献日历风格展示最近 365 天的每日 Token 活动热力图，悬停任意日期查看当天使用过的全部模型及其 Token 用量。

本仓库是独立 Git 仓库，**不修改、不 Fork、不派生** DeepSeek Harness 官方源码。插件通过 Harness 的 Session Projection、Projection Cache 和 Cordis/Typert 扩展点工作，安装与启用仅依赖包安装和 `cordis.yml` 配置。

---

## 1. 功能一览

- 设置界面新增一级导航「使用量 / Usage」，两次交互以内进入页面。
- 顶部五项指标卡：累计 Token、峰值 Token、最长聊天时长、当前连续天数、最长连续天数。
- 最近 365 个本地自然日的每日热力图（按周分列、周一至周日），跨年月份标签连续排列。
- 单日 Tooltip：日期、当日总量、当日全部模型及各自 Token（按 Token 降序，同名模型按 `Provider · Model` 消歧）。
- 历史会话自动回填（受限并发，默认 4），回填进度实时展示；单会话失败不影响整体。
- 全键盘可访问：Tab 聚焦日期格、Escape 关闭 Tooltip；每个格子带完整日期与 Token 数的无障碍名称。
- 严格隐私：只统计日期、Provider ID、Model ID、Token 数、活动时长和失败计数，不读取/存储/传输任何提示词、回复正文、工具参数或文件路径。

---

## 2. 兼容版本

| 依赖 | 版本要求 |
| --- | --- |
| DeepSeek Harness | `0.1.0-rc.5` 及以上（`@deepseek-ai/dsh-*` 同族） |
| Cordis（`@deepseek-ai/cordis`） | `^4.0.1` |
| Schemastery（`@deepseek-ai/schemastery`） | `^3.18.1` |
| Zod | `^4.4.3` |
| Node.js | `^22.19.0 || >=24.0.0` |
| 包管理器 | pnpm `>=8`（推荐 `11.x`） |

> 依赖版本不兼容时会在安装或加载阶段明确失败。若当前 Harness 版本缺少本插件所需的扩展点（`sessionProjections` / `sessionProjectionCache` / Typert Remote），插件将标注该版本不兼容，而不是引导给官方源码打补丁。

---

## 3. 仓库结构

```text
deepseek-harness-token-activity/
├─ packages/
│  ├─ token-activity/          # Host：@dsh-plugins/dsh-token-activity
│  │  └─ src/                  #   投影、聚合、回填、配置、数据接口
│  └─ ui-token-activity/       # Client：@dsh-plugins/dsh-ui-token-activity
│     └─ src/client/           #   设置入口、指标卡、热力图、Tooltip
├─ examples/cordis.yml         # 最小可运行的挂载示例
├─ package.json / pnpm-workspace.yaml / tsconfig*.json
├─ README.md / LICENSE / .gitignore
```

- **Host 包**负责读取 Session Projection、维护聚合结果、执行历史回填，并通过类型化 Typert Remote 向 Web 客户端提供受限的一次性摘要。
- **Client 包**通过 Harness 的 `settings.section` Client Slot 注册「使用量」设置页面，不直接读取任何持久化 Session 文件。
- 两个包在同一仓库内共同开发与发布；Host 专用模块不会被打入浏览器产物（Client 维护自己的纯函数副本）。

---

## 4. 安装

### 4.1 本地联调（推荐）

将本仓库放在官方源码仓库旁边，用 `pnpm workspace` 或 `file:` 依赖联调：

```text
D:\Desktop\项目\dsh\
├─ deepseek-harness\               # 官方仓库（仅作参考与联调目标，保持未修改）
└─ deepseek-harness-token-activity\   # 本仓库
```

在你的 Harness `package.json` 或插件宿主中：

```bash
pnpm add @dsh-plugins/dsh-token-activity@file:../deepseek-harness-token-activity/packages/token-activity
pnpm add @dsh-plugins/dsh-ui-token-activity@file:../deepseek-harness-token-activity/packages/ui-token-activity
```

### 4.2 面向其他用户分发

首选发布两个 npm 包，再以普通依赖安装：

```bash
pnpm add @dsh-plugins/dsh-token-activity
pnpm add @dsh-plugins/dsh-ui-token-activity
```

也可以使用 Git 仓库依赖或带校验值的打包产物。

---

## 5. 启用配置

仅安装依赖**不等于**启用。你必须在自己的 Harness Profile 或 `cordis.yml` 中显式挂载 Host 与 Client 两个插件：

```yaml
# 前置能力（稳定服务键）
- id: session-projection
  name: '@deepseek-ai/dsh-session-projection'
- id: session-projection-cache
  name: '@deepseek-ai/dsh-session-projection-cache'
  config:
    writeEveryEvents: 8
    writeIntervalMs: 2000
- id: session-persistence
  name: '@deepseek-ai/dsh-session-persistence-jsonl'

# Host 插件
- id: token-activity
  name: '@dsh-plugins/dsh-token-activity'
  config:
    timeZone: 'Asia/Shanghai'   # 可选，默认 Host 本机 IANA 时区
    backfillConcurrency: 4      # 可选，默认 4

# Client 插件（在 Web 应用 bundle 层生效）
- id: ui-token-activity
  name: '@dsh-plugins/dsh-ui-token-activity'
```

配置项（FR-08，Schemastery 在加载时校验）：

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `timeZone` | `string?` | Host 本机 IANA 时区 | 自然日划分时区；无效或不受支持时在加载时明确报错 |
| `backfillConcurrency` | `number` | `4` | 历史 Session 回填并发数（正整数） |

配置中**不包含**价格、预算或 Token 估算选项。

---

## 6. 数据口径（可重放、可验证）

- **单次活动 Token** = `inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens`。`reasoningTokens` 是输出子集，不重复计入（AC-04）。
- **模型身份** 以 `provider + model` 为主键；Tooltip 默认展示模型名，同名不同 Provider 时展示 `Provider · Model`（AC-02）。
- **日期归属** 按对应 `step/start` 时刻、在配置的 IANA 时区下归入自然日（AC-06）。
- **活跃日** 为当日精确 Token 总量大于 0 的自然日；当前连续天数以今天为终点，今天无活动为 0；最长连续为全部保留历史的最大连续活跃日数（AC-08）。
- **最长聊天时长** = 全部会话中「各完整 Turn 的 `turn/start → turn/end` 时长之和」的最大值；Turn 之间的空闲不计入（AC-09）。
- **usage 去重** 同一步骤的最终 `assistant/message` usage 替换早期 chunk；完全相同的重复样本不改变投影状态引用；失败请求保留已记录的 chunk；最终 message 缺 usage 时不删除已有 chunk（AC-03、§6.2）。
- **未报告 usage** 不按文本长度估算；未报告 usage 的调用不进总量，页面显示非阻断覆盖提示（AC-05）。
- 跨 Provider 汇总表示「各 Provider 报告的 Token 活动」，不代表不同 tokenizer 下完全可比的计算量，也不代表费用。

投影可完全由 Session 日志重放；缓存只是折算加速，缺失或失效时从日志重建。

---

## 7. 隐私与安全

- 统计内容仅含：日期、Provider ID、Model ID、Token 数量、活动时长、失败/跳过计数。
- **不**持久化、不读取、不传输：消息正文、工具参数、文件路径、密钥。
- 插件不新增任何遥测上传或云端同步。
- 远程浏览器只能访问 Host 已授权暴露的聚合结果，不能借此读取原始日志。

---

## 8. 升级步骤

1. 升级两个包到目标版本，保持 Host 与 Client 版本组合兼容（本仓库同版本发布，二者版本号一致）。
2. 修改 `cordis.yml` 配置（如需变更 `timeZone` 或 `backfillConcurrency`）。
3. 重启 Harness。变更 `timeZone` 会使投影 `stateVersion` 变化、旧缓存失效并自动重新回填，无需手工清理缓存。
4. 首次进入「使用量」页面时观察回填进度条；完成后页面自动刷新为完整统计。

---

## 9. 卸载步骤

1. 从 `cordis.yml` 移除 `token-activity` 与 `ui-token-activity` 两行。
2. `pnpm remove @dsh-plugins/dsh-token-activity @dsh-plugins/dsh-ui-token-activity`。
3. 重启 Harness。卸载后投影、接口、页面与监听器全部撤销（Cordis effect），官方仓库工作区保持未修改，Harness 可正常启动。

---

## 10. 开发与测试

```bash
pnpm install        # 安装依赖
pnpm run typecheck  # 两个包的类型检查（对照已发布的 @deepseek-ai/* 包）
pnpm run test       # 88 项单元 + 组件测试
pnpm run build      # 产出 lib/ 与类型声明
```

测试覆盖 PRD §10 的验收标准与 §11 的单元/组件场景：跨模型聚合、同名模型消歧、usage 去重、缓存口径、缺失 usage、时区与午夜、历史回填、连续天数、会话活动时长、键盘操作、大量模型滚动、删除会话，以及热力图 `log1p` 分级、几何对齐、Tooltip 排序与格式化、骨架/空/失败/回填状态。

---

## 11. 已知边界与兼容性说明

- **Client 端 Typert 绑定**：Host 通过 `TypertRemoteService` + `@Remote('summary')` 发布 `tokenActivity.summary` 命名空间；在完整 Harness 工作区中，Client 的 `ctx.remote.tokenActivity` 绑定由 Harness 的 Typert 构建工具链（`tsdown` + Typert generator）生成。本仓库的 `pnpm run build` 产出可发布的 JS 与类型声明；在 Harness 工作区内联调时使用官方构建流程以获得客户端绑定。
- **首版非目标**（PRD §12）均不在 v1 范围：每周/累计视图、费用估算、预算告警、CSV/JSON/图片导出、维度/Provider/模型筛选、云端同步、文本估算未报告 Token、修改官方单会话统计行。

---

## 12. 许可证

[MIT](./LICENSE)

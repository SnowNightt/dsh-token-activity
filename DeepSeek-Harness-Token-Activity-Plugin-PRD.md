# DeepSeek Harness Token 活动插件需求文档

> 文档状态：Draft  
> 版本：v0.2  
> 日期：2026-08-14  
> 目标仓库：独立第三方插件仓库（兼容 DeepSeek Harness）  
> 文档语言：简体中文

## 1. 背景

DeepSeek Harness 可以通过不同的 LLM Adapter 接入 DeepSeek、OpenAI、Anthropic、Google 及兼容 OpenAI 协议的自建服务。各适配器会把提供商返回的 Token 用量归一化为 Harness 的 `TokenUsage`，并随模型调用结果写入可持久化的 Session 日志。

当前产品已经能够在单个会话中展示 Token 统计，但缺少面向全部历史会话的长期活动视图。用户希望获得类似 GitHub Contribution Calendar 的年度热力图，用于观察每天的 Token 使用量，并在某一天的格子上查看当天使用过的全部模型及每个模型对应的 Token 用量。

## 2. 产品目标

### 2.1 目标

1. 汇总所有 Harness LLM Adapter 实际上报的 Token 用量。
2. 在 Web 设置界面提供独立的“使用量”页面。
3. 通过最近 12 个月的每日热力图呈现 Token 活动强度。
4. 在单日 Tooltip 中列出当天使用过的全部模型及各自 Token 总量。
5. 支持历史会话回填、后续增量更新以及不同提供商、不同模型间的切换。
6. 明确统计口径，使页面数字可重放、可验证且不会重复计数。
7. 以独立第三方插件形式开发和分发，不要求修改或派生 DeepSeek Harness 官方仓库。
8. 该项目为纯插件，零源码改动。

### 2.2 成功标准

- 用户可以在设置界面两次交互以内进入“使用量”页面。
- 页面能够正确展示最近 365 个自然日的 Token 活动。
- 任意有数据的日期都能查看完整的模型用量列表。
- 页面统计值与 Session 日志中的 Provider usage 重放结果一致。
- 安装插件之前已经存在的历史会话能够自动进入统计结果。
- 页面不会读取、存储或传输提示词、回复正文及工具输出内容。
- 用户能够通过发布的软件包安装并显式启用插件，无需修改 DeepSeek Harness 源码。

## 3. 目标用户与用户故事

### 3.1 目标用户

- 使用 DeepSeek Harness 进行日常开发的个人用户。
- 同时配置多个模型提供商并频繁切换模型的用户。
- 希望了解长期模型使用习惯和 Token 消耗趋势的维护者。

### 3.2 用户故事

1. 作为 Harness 用户，我希望看到最近一年的每日 Token 活动，以判断自己的使用频率和高峰日期。
2. 作为多模型用户，我希望将鼠标移到某一天时，看到当天所有模型及各自 Token 用量。
3. 作为成本敏感用户，我希望缓存 Token 与普通输入 Token 都被计入活动总量，但不会重复计算推理 Token。
4. 作为已有历史数据的用户，我希望安装插件后无需重新打开每个会话即可逐步补齐历史统计。
5. 作为键盘用户，我希望无需鼠标也能聚焦日期格并读取相同信息。

## 4. 名词与统计口径

### 4.1 TokenUsage 字段

Harness 统一用量包含以下字段：

- `inputTokens`：未缓存输入 Token。
- `outputTokens`：输出 Token；包含 Provider 已计入输出的 reasoning Token。
- `cacheReadTokens`：缓存读取 Token；字段缺失时按 0 处理。
- `cacheWriteTokens`：缓存写入 Token；字段缺失时按 0 处理。
- `reasoningTokens`：输出 Token 中的推理子集，仅供解释，不再次加入总量。

单次模型调用的活动 Token 总量定义为：

```text
inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens
```

### 4.2 模型身份

- 统计主键使用 `provider + model`，不得只用模型名。
- Tooltip 默认展示模型名，例如 `gpt-5.6`。
- 当同一天存在相同模型名但 Provider 不同时，展示为 `Provider · Model`，例如 `OpenAI · gpt-5.6` 与 `Gateway · gpt-5.6`。
- Provider 或模型已从当前配置移除时，历史数据仍显示日志中保存的原始 ID。

### 4.3 日期归属

- 每次模型调用按对应 `step/start` 的时间归属到一个自然日。
- 日期计算使用插件解析出的 IANA 时区。
- 默认时区为 Host 本机当前 IANA 时区。
- 插件配置允许显式设置 `timeZone`，例如 `Asia/Shanghai`。
- 无效或 Host 不支持的 IANA 时区必须在插件加载时明确报错，不能静默回退。

### 4.4 活跃日与连续天数

- 当自然日的精确 Token 总量大于 0 时，该日为活跃日。
- 当前连续使用天数为以“今天”为终点向前连续的活跃日数量；今天尚无活动时为 0。
- 最长连续使用天数为全部保留历史中最长的连续活跃日数量。

### 4.5 最长聊天活动时长

- 单个会话的活动时长为该会话所有完整 Turn 的持续时间之和。
- 一个 Turn 的持续时间为对应 `turn/start` 到 `turn/end` 的时间差。
- 会话之间以及两次 Turn 之间的用户空闲时间不计入活动时长。
- 最长聊天活动时长为全部保留会话中活动时长的最大值。

### 4.6 未报告用量

- Provider 没有返回 usage 时，不得根据文本长度、字符数或本地 tokenizer 估算 Token。
- 未报告 usage 的调用不进入精确 Token 总量。
- 当统计范围内存在未报告 usage 的调用时，页面显示非阻断提示：“部分模型调用未报告 Token 用量，统计结果仅包含 Provider 已报告数据。”
- 跨 Provider 汇总表示“各 Provider 报告的 Token 活动”，不代表不同 tokenizer 下完全可比的计算量，也不代表费用。

## 5. 功能需求

### FR-01：设置页面入口

- Web 设置界面左侧导航新增一级菜单“使用量”。
- 点击“使用量”后，右侧内容区展示 Token 活动页面。
- 页面注册为现有 `settings.section` 扩展，不改变设置壳层的导航和关闭行为。
- 导航文本支持中文和英文；中文为“使用量”，英文为“Usage”。

### FR-02：页面顶部指标卡

页面顶部固定展示以下两项指标：

1. **累计 Token 数**：全部保留历史中精确 Token 总量之和。
2. **峰值 Token 数**：全部保留历史中单个自然日的最高精确 Token 总量。

展示规则：

- Token 数使用紧凑格式，例如 `10.31亿`、`21亿`、`128.4万`；悬停或无障碍名称保留完整整数。
- 指标尚未计算完成时显示骨架占位，不显示伪造的 0。
- 完成计算但无数据时显示 0。

### FR-03：每日 Token 热力图

- 指标卡下方展示“Token 活动”区块。
- 首版只提供“每日”视图，不展示“每周”或“累计”切换标签。
- 默认范围为包含今天在内的最近 365 个本地自然日。
- 热力图按周分列、按星期分为 7 行，星期顺序为周一至周日。
- 范围开始前用于周对齐的格子为空白占位，不参与统计和交互。
- 图表显示月份标签；跨年时月份仍按时间顺序连续排列。
- 每个有效日期格必须可通过鼠标悬停、点击和键盘 Tab 聚焦。

### FR-04：热力图颜色

- 无活动日期使用中性底色。
- 有活动日期使用同一品牌色的 4 个强度等级。
- 强度基于当前 365 日范围内的最大单日 Token 计算。
- 为降低极端峰值影响，归一化使用：

```text
ratio = log1p(dayTokens) / log1p(maxDayTokens)
```

- `ratio` 依次映射到 `(0, 0.25]`、`(0.25, 0.5]`、`(0.5, 0.75]`、`(0.75, 1]` 四级颜色。
- 当范围内最大值为 0 时，所有日期使用中性底色。
- 颜色不是唯一的信息表达方式；每个格子拥有包含日期和完整 Token 数的无障碍名称。

### FR-05：单日 Tooltip

鼠标悬停、键盘聚焦或触屏点击日期格时展示 Tooltip。

Tooltip 内容固定为：

1. 日期，例如 `2026年8月14日`。
2. 当天总量，例如 `总计 30,000 tokens`。
3. 当天使用过的全部模型及各自 Token 总量。

示例：

```text
2026年8月14日
总计 30,000 tokens

deepseek-v4-pro    20,000 tokens
gpt-5.6            10,000 tokens
```

交互规则：

- 模型按 Token 总量从高到低排序。
- 用量相同时，按 Provider ID、Model ID 的字典序稳定排序。
- Tooltip 不展示输入、输出、缓存或调用次数明细。
- 必须列出当天全部模型，不允许用“其他”合并或只显示 Top N。
- 模型较多时 Tooltip 设定最大高度并提供内部滚动。
- Token 数使用本地化千分位格式并保留完整整数。
- 无活动日期的 Tooltip 显示日期与 `0 tokens`，不显示模型列表。
- 鼠标离开日期格和 Tooltip 后关闭；键盘按 Escape 关闭；触屏再次点击格子外区域关闭。

### FR-06：加载、空数据和失败状态

- 首次读取时，指标卡与热力图显示与最终布局一致的骨架状态。
- 没有任何精确 usage 时，显示中性热力图和空状态文案“暂无 Token 使用记录”。
- 数据读取失败时，右侧内容区显示错误摘要和“重试”按钮。
- 重试不得刷新整个 Web 应用。
- 历史回填进行中时，页面显示 `正在索引历史会话：已完成 X / Y`，并展示当前已经可用的结果。
- 回填完成后页面自动刷新为完整统计，无需用户重新进入页面。

### FR-07：历史回填和增量更新

- 插件首次启用或投影版本变化后，枚举当前持久化 Session 语料库并补齐缺失投影。
- 回填使用受限并发，默认并发数为 4，并可通过插件配置修改为正安全整数。
- 回填不得阻塞 Web Host 启动，不得一次性把全部日志常驻内存。
- 回填按 Session 独立失败；单个损坏或不可读 Session 不阻止其他 Session 完成。
- 页面需要报告跳过的 Session 数量，但不得暴露提示词或日志正文。
- 新增 Session 事件通过现有 Session Projection 驱动增量更新。
- Session 删除后，该 Session 的统计必须从下一次聚合结果中移除。

### FR-08：插件配置

Host 插件提供以下配置：

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `timeZone` | `string?` | Host 本机 IANA 时区 | 自然日划分时区 |
| `backfillConcurrency` | `number` | `4` | 历史 Session 回填并发数 |

- 配置通过 Schemastery 在插件加载时验证。
- 时区改变会使按日期聚合的投影失效并重新回填，不能沿用旧时区缓存。
- 配置中不包含价格、预算或 Token 估算选项。

## 6. 数据需求

### 6.1 每日投影

每个 Session 的客户端安全投影至少包含：

```ts
interface TokenActivityProjection {
  days: Record<string, TokenActivityDay>
  totalTokens: number
  activeMs: number
  unreportedCalls: number
}

interface TokenActivityDay {
  totalTokens: number
  models: TokenActivityModel[]
}

interface TokenActivityModel {
  provider: string
  model: string
  tokens: number
}
```

约束：

- `days` 的键为投影配置时区下的 `YYYY-MM-DD`。
- 每日 `totalTokens` 必须等于 `models[].tokens` 之和。
- 同一个 `provider + model` 在同一天只能出现一项。
- 数值均为非负安全整数。
- 数组在投影输出时按 Token 降序稳定排序。

### 6.2 去重规则

- 一次模型步骤的稳定身份为 `sessionId + turn + step`。
- 同一步骤可能先产生 `assistant/chunk` usage，随后产生 `assistant/message` 最终 usage。
- 最终 usage 替换该步骤的早期 usage 样本，不得与其相加。
- 完全相同的重复样本不改变投影状态引用，避免无意义的客户端推送。
- 如果请求失败但在失败前已经记录 usage chunk，该早期样本保留并进入统计。
- 如果最终 assistant message 不带 usage，则不得删除同一步骤已经记录的 usage chunk。

### 6.3 Provider 与 Model 来源

- 最终 assistant message 存在时，以 `message.source.provider` 和 `message.source.model` 为准。
- 只有 usage chunk、没有最终 message 时，使用该步骤生效的 `request/header.config.provider` 和 `request/header.config.model`。
- 无法确定 Provider 或 Model 的 usage 样本标记为损坏数据并跳过，不得归入虚构的 `unknown` 模型。

### 6.4 聚合接口

Host 向 Web 客户端提供一次性完整摘要：

```ts
interface TokenActivitySummary {
  timeZone: string
  generatedAt: number
  range: { from: string; to: string }
  metrics: {
    totalTokens: number
    peakDailyTokens: number
    longestActiveChatMs: number
    currentStreakDays: number
    longestStreakDays: number
    unreportedCalls: number
  }
  days: Array<{
    date: string
    totalTokens: number
    models: Array<{
      provider: string
      model: string
      tokens: number
    }>
  }>
  backfill: {
    state: 'idle' | 'running' | 'complete' | 'partial-failure'
    completedSessions: number
    totalSessions: number
    failedSessions: number
  }
}
```

- `days` 只返回请求范围内有活动的数据；客户端补齐无活动日期。
- 指标中的累计、峰值和连续天数基于全部保留历史，而不是仅限最近 365 日。
- 接口不得返回 Session 消息、提示词、响应内容、工具调用参数或文件路径。

## 7. 交互与视觉要求

### 7.1 页面布局

从上到下依次为：

1. 五项指标卡横向区域。
2. 数据覆盖提示或历史回填进度，仅在需要时出现。
3. “Token 活动”标题。
4. 每日热力图。
5. 颜色强度图例。

- 宽屏下五项指标在一行内平均分布。
- 窄屏下允许换行，不允许横向溢出设置内容区。
- 热力图在内容区不足时允许水平滚动，日期格保持可点击尺寸。

### 7.2 日期格与 Tooltip

- 日期格使用小圆角正方形，水平和垂直间距一致。
- 当前聚焦格显示明显的两像素焦点环。
- Tooltip 锚定当前格，优先显示在上方；空间不足时自动翻转或平移，不能超出视口。
- 模型名称左对齐，Token 数右对齐。
- Tooltip 模型区最大高度建议为 240px，超出后内部滚动。
- Tooltip 文本必须可选中，不因用户把指针移入 Tooltip 而立即消失。

### 7.3 响应式与本地化

- 日期、数字、时长和月份标签使用当前 Web Locale。
- 中文 Token 单位可使用万、亿；英文使用 K、M、B。
- Tooltip 中的完整 Token 数始终使用本地化千分位，不使用缩写。
- 中文模型 ID、英文模型 ID 和长网关模型名都必须正确截断；完整名称通过 Tooltip 行的无障碍名称保留。

## 8. 技术约束

### 8.1 Harness 集成约束

1. 不修改 Agent Loop；通过已有 Session 事件和扩展点实现。
2. Host 侧复用 `TokenUsage`、Session Projection 和 Projection Cache。
3. 投影函数必须是同步、纯函数；不读取时钟、配置外状态或文件系统。
4. Projection `stateVersion` 必须在字段或折算语义变化时更新。
5. 时区属于投影语义；配置时区变化必须使旧缓存失效。
6. Web 侧通过现有 Client Slot 注册设置页面，不直接读取 Session 持久化文件。
7. Host 到 Client 的数据通过类型化 Remote 或等价受保护接口传输；不得开放任意 Session 读取能力。
8. 所有注册均为 Cordis effect，插件卸载后投影、接口、页面和监听器全部撤销。
9. 产品可见变更需要真实 Loader 组合测试、Web 快照和浏览器交互 GIF。
10. 非平凡变更需在同一 PR 添加 Agent Note，并同步相关 README 与 JSDoc。

### 8.2 独立开发仓库

- 插件代码必须存放在独立 Git 仓库中，不放入 DeepSeek Harness 官方仓库的 `packages/` 目录，也不以官方仓库 Fork 作为长期开发仓库。
- 推荐把插件仓库放在官方源码仓库旁边，方便本地联调，同时保持两套 Git 历史完全独立。例如：

```text
D:\Desktop\项目\dsh\
├─ deepseek-harness\
└─ deepseek-harness-token-activity\
```

- 官方 DeepSeek Harness 源码仅作为架构参考、类型来源和集成测试目标。插件的开发、提交、版本、Issue、发布和许可证均由独立仓库管理。
- 插件安装与卸载不得要求用户手工修改官方源码文件。必要的启用操作必须通过依赖安装和 Cordis 配置完成。
- 独立仓库必须明确声明兼容的 DeepSeek Harness、Cordis、Node.js 和包管理器版本；依赖版本不兼容时应在安装、构建或加载阶段明确失败。

### 8.3 仓库和包目录结构

独立仓库采用 pnpm workspace，至少拆分 Host 和 Web Client 两个职责不同的软件包：

```text
deepseek-harness-token-activity/
├─ packages/
│  ├─ token-activity/          # Host：投影、聚合、回填、配置和数据接口
│  └─ ui-token-activity/       # Client：设置入口、指标卡、热力图和 Tooltip
├─ examples/
│  └─ cordis.yml               # 最小可运行的安装和启用示例
├─ package.json
├─ pnpm-workspace.yaml
├─ tsconfig.json
├─ README.md
├─ LICENSE
└─ .gitignore
```

- Host 包建议命名为 `@<scope>/dsh-token-activity`，负责读取 Session Projection、维护聚合结果并向 Web Client 提供受限接口。
- Client 包建议命名为 `@<scope>/dsh-ui-token-activity`，通过 Harness 的 Client 扩展入口注册“使用量”设置页面。
- 两个包可以在同一个独立 Git 仓库中共同开发和发布，但不得把 Host 专用模块打入浏览器产物。
- `examples/cordis.yml` 必须展示两个包的挂载顺序、必要配置和默认配置，且不得包含 API Key、用户目录或真实 Session 数据。
- `README.md` 必须包含兼容版本、安装方式、启用配置、数据口径、隐私说明、升级步骤和卸载步骤。

### 8.4 Git 初始化要求

在创建上述目录和基础文件后，于插件仓库根目录执行独立的 Git 初始化：

```powershell
git init
git branch -M main
git add .
git commit -m "feat: initialize token activity plugin"
```

- 首次提交必须包含 workspace 配置、Host 与 Client 包骨架、最小示例、README、许可证和 `.gitignore`。
- 首次提交不得包含 `node_modules`、构建产物、测试覆盖率目录、日志、缓存、`.env`、密钥、用户 Session、Projection Cache 或本地数据库。
- 插件仓库不得作为 DeepSeek Harness 官方仓库的 Git submodule，也不得把官方仓库提交历史复制进来。
- 后续发布使用独立的语义化版本和 Git tag；Host 与 Client 版本应保持兼容，并在 README 中说明允许的版本组合。
- 是否连接 GitHub、GitLab 或其他远程仓库由维护者决定；本地自用不要求配置远程仓库。

### 8.5 发布、安装和启用

- 本地开发和自用必须支持 pnpm workspace link 或 `file:` 依赖，便于与相邻的 DeepSeek Harness 源码联调。
- 面向其他用户分发时，首选发布 Host 与 Client 两个 npm 包；也可以提供 Git 仓库依赖或带校验值的打包产物。
- 安装完成后，用户必须在自己的 Harness Profile 或 `cordis.yml` 中显式挂载 Host 和 Client 插件；仅复制仓库目录或安装依赖不能视为已经启用。
- 安装文档必须提供可直接复用的依赖安装命令和 Cordis 配置示例，并说明重启、升级和卸载后的预期行为。
- 插件不得要求使用者重新编译或修改官方 Harness。若 Harness 当前版本缺少外部插件所需扩展点，插件应明确标注该版本不兼容，而不是引导用户打补丁修改官方源码。
- 发布包不得包含提示词、回复内容、Session 日志、开发者本地路径、凭据或其他个人数据。

## 9. 非功能需求

### 9.1 性能

- 页面只渲染 365 个有效日期格及少量周对齐占位格。
- 已有投影缓存时，读取摘要不得重新扫描全部 Session 日志。
- 历史回填采用流式、受限并发方式；默认同一时间最多读取 4 个 Session。
- 单个 Session 的失败不得中断全局聚合。
- 回填期间 Web 页面保持可交互，并分批更新进度。

### 9.2 可靠性

- 投影结果必须能够完全由 Session 日志重放。
- 缓存是折算加速，不是统计权威；缓存缺失或失效时从日志重建。
- 进程在回填中退出后，下次启动从未完成部分继续，不重复累计已完成数据。
- HMR 或插件卸载、重载不得留下重复注册或重复监听器。

### 9.3 隐私与安全

- 统计数据仅包含日期、Provider ID、Model ID、Token 数量、活动时长和失败计数。
- 不持久化消息正文、工具参数、文件路径或密钥。
- 插件不新增遥测上传或云端同步。
- 远程浏览器只能访问当前 Host 已授权暴露的聚合结果，不能借此读取原始日志。

### 9.4 可访问性

- 每个日期格可键盘聚焦。
- Tooltip 可通过焦点打开并由 Escape 关闭。
- 日期格的无障碍名称包含完整日期和 Token 数。
- 模型列表以可被屏幕阅读器理解的名称—数值对呈现。
- 所有文字和焦点状态满足现有主题的对比度要求。

## 10. 验收标准

### AC-01：跨模型聚合

给定同一天内：

- `openai/gpt-5.6` 使用 10,000 tokens；
- `deepseek-official/deepseek-v4-pro` 使用 20,000 tokens；

则该日期格总量为 30,000 tokens，Tooltip 按以下顺序完整展示：

```text
deepseek-v4-pro    20,000 tokens
gpt-5.6            10,000 tokens
```

### AC-02：同名模型消歧

同一天内两个 Provider 都使用 `gpt-5.6` 时，Tooltip 必须分别显示 Provider，且两条数据不能合并。

### AC-03：usage 去重

同一步骤先记录 8,000 tokens 的 usage chunk，最终 message 报告 10,000 tokens 时，该步骤最终只贡献 10,000 tokens。

### AC-04：缓存统计

调用报告输入 1,000、输出 500、缓存读取 4,000、缓存写入 500、推理 200 时，总量为 6,000，而不是 6,200。

### AC-05：缺失 usage

存在不带 usage 的已完成模型调用时，该调用不增加 Token 总量，页面出现部分数据覆盖提示。

### AC-06：时区与午夜

在 `Asia/Shanghai` 配置下，UTC 2026-08-14 16:30 的步骤归入本地 2026-08-15；切换到 `UTC` 后重新回填并归入 2026-08-14。

### AC-07：历史回填

在已有持久化会话后安装插件，页面显示回填进度；完成后历史日期和模型用量与日志重放一致。

### AC-08：连续天数

若今天及之前连续 5 天有活动，当前连续天数为 5；若今天无活动，则当前连续天数为 0。历史最长连续 12 天时，最长连续天数为 12。

### AC-09：会话活动时长

一个 Session 有两个完整 Turn，分别持续 2 分钟和 3 分钟，中间空闲 1 小时，则该 Session 活动时长为 5 分钟。

### AC-10：键盘操作

用户可以使用 Tab 聚焦任一日期格，读取与鼠标悬停相同的 Tooltip，并使用 Escape 关闭。

### AC-11：大量模型

某日包含超过 Tooltip 可视高度的模型列表时，全部模型仍存在于列表中，并可通过内部滚动访问。

### AC-12：删除会话

删除一个 Session 后，该 Session 独有的 Token 用量从累计指标、日历和 Tooltip 中移除。

### AC-13：独立仓库和安装

从一个未修改的兼容版 DeepSeek Harness 开始，用户按照 README 安装 Host 与 Client 软件包并应用示例 Cordis 配置后，可以进入“使用量”页面；移除配置和软件包后，Harness 仍可正常启动，官方仓库工作区保持无修改。

## 11. 测试场景

### 11.1 单元测试

- 单模型、单 Provider、单日折算。
- 同日多个模型和多个 Provider 聚合。
- 同名模型跨 Provider 消歧。
- usage chunk 被最终 message 替换。
- 相同 usage 样本重复出现不重复累计。
- 失败请求只有 usage chunk 时保留用量。
- 最终 message 缺少 usage 时保留已有 chunk 样本。
- 缓存读取、缓存写入和推理 Token 的互斥口径。
- 缺失可选字段按 0 处理。
- Provider 未报告 usage 的排除与计数。
- 跨午夜、闰日、跨年和夏令时切换。
- 当前连续天数和最长连续天数。
- Turn 活动时长排除 Turn 之间的空闲时间。
- 热力图 `log1p` 强度分级和全零数据。

### 11.2 组合测试

- 通过真实 Loader 和 `cordis.yml` 启动 Host 投影与 Web Client 插件。
- 修改时区配置会使旧投影缓存失效并重新回填。
- 插件 fiber dispose 后投影、页面和接口注册全部消失。
- 历史 Session 从 Projection Cache 冷读取并正确进入列表。
- 单个损坏 Session 不阻止其他 Session 回填。

### 11.3 Web 测试

- 设置左侧出现“使用量”菜单，点击后右侧展示页面。
- 骨架、空数据、失败、重试、回填进度及完成状态。
- 指标卡在宽屏和窄屏下布局正确。
- 365 日热力图、月份标签和周对齐正确。
- Tooltip 列出所有模型、排序正确、Token 数格式正确。
- 鼠标、键盘和触屏关闭路径。
- 长模型名、重复模型名及大量模型滚动。
- 浅色和深色主题下的颜色、焦点与对比度。
- Web snapshot 固定主要视觉状态，真实浏览器 GIF 展示从设置菜单进入页面并悬停日期格。

## 12. 首版非目标

以下能力不纳入 v1：

- 每周视图。
- 累计趋势视图。
- Token 费用估算或 Provider 价格表。
- 预算、配额和用量告警。
- CSV、JSON 或图片导出。
- 团队、用户或 Workspace 维度筛选。
- Provider 或模型筛选器。
- 云端同步与遥测上传。
- 根据消息文本估算未报告 Token。
- 修改或替代现有单会话 Token 统计行。
- 向 DeepSeek Harness 官方仓库提交或合并插件代码。
- 维护 DeepSeek Harness 的长期 Fork 或要求用户给官方源码打补丁。

## 13. 后续候选能力

v1 验证后可单独评估：

- 每周与累计趋势视图。
- 按 Provider、模型或 Workspace 筛选。
- 输入、输出、缓存的 Tooltip 明细。
- 基于带生效日期价格表的费用统计。
- Token 预算与本地告警。
- 数据导出。

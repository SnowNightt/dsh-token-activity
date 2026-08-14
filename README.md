# DeepSeek Harness Token 消耗热力图插件

> 面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的**第三方插件**：展示最近 365 天的每日 Token 消耗热力图，悬停任意日期查看当天使用过的全部模型及其 Token 用量。

---

## 1. 插件功能

- 设置界面新增一级导航「使用量 / Usage」，两次交互以内进入页面。
- 顶部五项指标卡：累计 Token、峰值 Token、最长聊天时长、当前连续天数、最长连续天数。
- 最近 365 个本地自然日的每日热力图（按周分列、周一至周日），跨年月份标签连续排列。
- 单日 Tooltip：日期、当日总量、当日全部模型及各自 Token（按 Token 降序，同名模型按 `Provider · Model` 消歧）。
- 历史会话自动回填（受限并发，默认 4），回填进度实时展示；单会话失败不影响整体。
- 全键盘可访问：Tab 聚焦日期格、Escape 关闭 Tooltip；每个格子带完整日期与 Token 数的无障碍名称。
- 严格隐私：只统计日期、Provider ID、Model ID、Token 数、活动时长和失败计数，不读取/存储/传输任何提示词、回复正文、工具参数或文件路径。

---

## 2. 安装

### 2.1 环境要求

- Node.js `^22.19.0 || >=24.0.0`

### 2.2 从 npm 安装（推荐）

安装聚合包：

```sh
dsh plugin --profile web add @snownightt/dsh-token-activity-bundle@0.1.0
```

安装完成后重启 DeepSeek Harness：

```sh
dsh web
```

如果通过 DeepSeek Harness 源码运行，将上述命令中的 `dsh` 替换为 `pnpm dsh`：

```sh
pnpm dsh plugin --profile web add @snownightt/dsh-token-activity-bundle@0.1.0
pnpm dsh web
```

### 2.3 从本地源码安装到 DeepSeek Harness

推荐将两个仓库放在同一父目录。

先安装并构建插件：

```sh
pnpm install --frozen-lockfile
pnpm run test
pnpm run typecheck
pnpm run build
```

然后进入 DeepSeek Harness 源码仓库，将三个本地包一次性安装进 `web` profile：

```sh
pnpm dsh plugin --profile web add ../deepseek-harness-token-activity/packages/token-activity ../deepseek-harness-token-activity/packages/ui-token-activity ../deepseek-harness-token-activity/packages/token-activity-bundle
```

安装成功后检查组合配置并启动：

```sh
pnpm dsh --profile web --dump-config
pnpm dsh web
```

只要配置中同时出现以下两个插件行，就已经完成自动挂载：

```text
token-activity
ui-token-activity
```

### 2.4 卸载

从 npm 安装时：

```sh
dsh plugin --profile web remove @snownightt/dsh-token-activity-bundle
```

从本地源码安装时，同时移除三个包：

```sh
pnpm dsh plugin --profile web remove @snownightt/dsh-token-activity-bundle @snownightt/dsh-token-activity @snownightt/dsh-ui-token-activity
```

卸载后重启。

---



## 3. 隐私与安全

- 统计内容仅含：日期、Provider ID、Model ID、Token 数量、活动时长、失败/跳过计数。
- **不**持久化、不读取、不传输：消息正文、工具参数、文件路径、密钥。
- 插件不新增任何遥测上传或云端同步。
- 远程浏览器只能访问 Host 已授权暴露的聚合结果，不能借此读取原始日志。

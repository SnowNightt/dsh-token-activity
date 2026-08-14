# DeepSeek Harness Token 消耗热力图插件

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> 面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的**第三方插件**：展示最近 365 天的每日 Token 消耗热力图，悬停任意日期查看当天使用过的全部模型及其 Token 用量。

---

## 插件功能

- 设置界面新增一级导航「使用量 」。
- 顶部两项指标卡：累计 Token、峰值 Token。
- 最近 365 个本地自然日的每日热力图，跨年月份标签连续排列。
- 单日 Tooltip：日期、当日总量、当日全部模型及各自 Token。
- 历史会话自动回填，回填进度实时展示；单会话失败不影响整体。

### 效果预览

![DeepSeek Harness Token 活动热力图效果预览](docs/images/token-activity-preview.png)

---

## 安装

### 环境要求

- Node.js `^22.19.0 || >=24.0.0`

如果终端提示找不到 `dsh` 命令，请先全局安装 DSH CLI：

```sh
npm install --global @deepseek-ai/dsh --registry=https://registry.npmjs.org/
```

### 从 npm 安装（推荐）

安装npm包：

```sh
dsh plugin --profile web add @snownightt/dsh-token-activity-bundle
```

安装完成后重启 DeepSeek Harness。

如果你的 DeepSeek Harness 是本地运行的，则在 Deepseek Harness 根目录下执行安装命令：

```sh
pnpm dsh plugin --profile web add @snownightt/dsh-token-activity-bundle
```

### 更新插件

重新安装即可获取 npm 上的最新版本，然后重启 DeepSeek Harness：

```sh
dsh plugin --profile web remove @snownightt/dsh-token-activity-bundle
dsh plugin --profile web add @snownightt/dsh-token-activity-bundle
dsh web
```

### 本地开发

推荐将 Deepseek Harness 和本项目放在同一父目录。

先安装并构建插件：

```sh
pnpm install --frozen-lockfile
pnpm run test
pnpm run typecheck
pnpm run build
```

然后进入 DeepSeek Harness 根目录执行：

```sh
pnpm dsh plugin --profile web add ../deepseek-harness-token-activity/packages/token-activity ../deepseek-harness-token-activity/packages/ui-token-activity ../deepseek-harness-token-activity/packages/token-activity-bundle
```

安装成功后检查组合配置：

```sh
pnpm dsh --profile web --dump-config
```

只要配置中同时出现以下两个插件行，就说明安装成功，然后启动 Deepseek Harness：

```text
token-activity
ui-token-activity
```

### 卸载

从 npm 安装则执行：

```sh
dsh plugin --profile web remove @snownightt/dsh-token-activity-bundle
```

本地安装则执行：

```sh
pnpm dsh plugin --profile web remove @snownightt/dsh-token-activity-bundle @snownightt/dsh-token-activity @snownightt/dsh-ui-token-activity
```

卸载后重启。

---



## PS
目前仍处于开发中，各方面或许不够完善，欢迎大家提issue！谢谢喵！

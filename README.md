**中文** | [English](README.en.md)

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

## 兼容性

| 项目 | 已验证版本 |
| --- | --- |
| DeepSeek Harness | `@deepseek-ai/dsh@0.1.0-rc.6` |
| DSH 源码快照 | [`47f943859bef`](https://github.com/deepseek-ai/deepseek-harness/commit/47f943859bef60e4160492346772ded9b24f765a) |
| 插件版本 | `0.1.1` |
| Node.js | `24.18.0` |
| pnpm | `11.7.0` |
| 最后验证日期 | `2026-08-15` |

上述环境已验证插件可以安装和加载，Web 设置页面能够显示「使用量」入口，并可完成历史会话 Token 数据回填及热力图展示。

---

## 安装

### 环境要求

- Node.js `>=24.0.0`
- pnpm `11.7.0`

如果终端提示找不到 `dsh` 命令，请先全局安装 DSH CLI：

```sh
npm install --global @deepseek-ai/dsh --registry=https://registry.npmjs.org/
```

### 从 npm 安装

安装npm包：

```sh
dsh plugin --profile web add @snownightt/dsh-token-activity-bundle@0.1.1
```

安装完成后重启 DeepSeek Harness。

如果你的 DeepSeek Harness 是本地运行的，则在 Deepseek Harness 根目录下执行安装命令：

```sh
pnpm dsh plugin --profile web add @snownightt/dsh-token-activity-bundle
```

## 快速开始

1. 安装插件后，启动或重启 DeepSeek Harness Web 服务：

   ```sh
   dsh web
   ```

   如果你是在 DeepSeek Harness 源码目录中运行，请使用：

   ```sh
   pnpm dsh web
   ```

2. 在浏览器中打开 DeepSeek Harness Web 界面,进入「设置」，点击一级导航中的「使用量」。

3. 首次打开时，插件会自动回填历史会话数据。等待页面上的回填进度完成；单个会话读取失败不会中断其他数据的统计。

4. 回填完成后，页面应显示：

   - 累计 Token 数；
   - 单日峰值 Token 数；
   - 最近 365 个本地自然日的 Token 使用热力图；
   - 将鼠标悬停在任意日期上时，显示当天总 Token 数及当天使用过的各模型用量。

### 验证安装

执行以下命令检查组合配置：

```sh
dsh --profile web --dump-config
```

如果你是在 DeepSeek Harness 源码目录中运行，请使用：

```sh
pnpm dsh --profile web --dump-config
```

输出中应同时包含：

```text
token-activity
ui-token-activity
```

如果配置中包含上述两个插件，但「设置 → 使用量」没有出现，请重启 DeepSeek Harness Web 服务并刷新浏览器页面。

## 本地开发

若是本地启动 Deepseek Harness 并且 git clone 本仓库，推荐将 Deepseek Harness 和本项目放在同一父目录。

先安装并构建插件：

```sh
pnpm install --frozen-lockfile
pnpm run test
pnpm run typecheck
pnpm run build
```

然后进入 DeepSeek Harness 根目录执行：

```sh
pnpm dsh plugin --profile web add ../dsh-token-activity/packages/token-activity ../dsh-token-activity/packages/ui-token-activity ../dsh-token-activity/packages/token-activity-bundle
```

如果 Deepseek Harness 和本项目没在同一父级目录下，上面的安装命令中路径部分自行调整。

本地开发后插件需要重新打包然后重启 Deepseek Harness

## 卸载

从 npm 安装则执行：

```sh
dsh plugin --profile web remove @snownightt/dsh-token-activity-bundle
```
卸载后重启。

---



## PS
目前仍处于开发中，各方面或许不够完善，欢迎大家提issue！谢谢喵！

**中文** | [English](README.en.md)

# dsh-token-activity Token 消耗热力图插件

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

- Node.js `>=24.0.0`
- pnpm `11.7.0`

如果终端提示找不到 `dsh` 命令，请先全局安装 DSH CLI：

```sh
npm install --global @deepseek-ai/dsh --registry=https://registry.npmjs.org/
```

### 从 npm 安装

```sh
# 以管理员身份运行
dsh plugin --profile web add @snownightt/dsh-token-activity-bundle

# 安装完成重启
dsh web
```



## 快速开始

1. 安装插件后，启动 DeepSeek Harness Web 服务：

   ```sh
   dsh web
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

输出中应同时包含：

```text
token-activity
ui-token-activity
```

如果配置中包含上述两个插件，但「设置 → 使用量」没有出现，请重启 DeepSeek Harness Web 服务并刷新浏览器页面。

## 本地开发

本地启动 Deepseek Harness 并且fock并拉取本仓库，推荐将 Deepseek Harness 和本项目放在同一父目录。

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

本地卸载：

```sh
# 需在 Deepseek Harness 目录下执行
 pnpm dsh plugin --profile web remove @snownightt/dsh-token-activity @snownightt/dsh-token-activity-bundle @snownightt/dsh-ui-token-activity  

 # 可在任意目录执行
 dsh plugin --profile web remove @snownightt/dsh-token-activity @snownightt/dsh-token-activity-bundle @snownightt/dsh-ui-token-activity
```

卸载后重启。

## 更新
```sh
# 先删除旧包
dsh plugin --profile web remove @snownightt/dsh-token-activity-bundle

# 安装新包，以管理员身份运行
dsh plugin --profile web add @snownightt/dsh-token-activity-bundle
```


---

## 已知限制

本插件基于 DeepSeek Harness 的**会话日志**统计已记录的模型调用 Token，并不直接读取 API 提供商的账户账单。因此，插件显示的累计量应理解为「Harness 会话已记录 Token」，不能替代提供商平台的账户用量；涉及费用、余额或最终计费时，请始终以 API 提供商官方平台为准。

在当前版本中，以下情况可能使插件统计值与官方平台现实的值不一致：

- 自动标题生成、上下文压缩等辅助模型调用可能未完整计入会话活动统计；
- 网页搜索会产生额外模型调用，但其响应 Token 用量目前不会写入本插件的统计来源；
- 失败、取消或重试的请求只有在 Harness 会话日志中保存了 `usage` 时才会被统计；
- 某个历史会话读取失败时，插件会跳过它，不影响其他会话继续统计；但该会话的 token 会缺失，直到之后成功重新回填。
- API Key 被其他应用、脚本或服务使用的调用不在本插件的可见范围内。

已写入日志的普通会话模型调用会按 `input + output + cache read + cache write` 统计。未来版本会逐步扩大辅助调用的覆盖范围，但不同提供商的账单口径、缓存规则和可用用量接口仍可能导致与官方账户数据存在差异。

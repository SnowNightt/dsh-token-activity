# `@dsh-plugins/dsh-token-activity-bundle`

Token 活动插件的**组合包（profile bundle）**：一次安装即可同时挂载 Host 插件与 Web 客户端插件，并自动加入 profile 的 `dsh.profile.bundles` 层列表。

本包本身不含运行时代码，其全部内容就是 `cordis.patch.yml`（通过 `dsh.bundle.patch` 声明），以及对其依赖的两个插件包：

- `@dsh-plugins/dsh-token-activity`（Host）
- `@dsh-plugins/dsh-ui-token-activity`（Web client）

## 安装

```bash
# 从 npm（发布后）
dsh plugin --profile web add @dsh-plugins/dsh-token-activity-bundle

# 本地 checkout
dsh plugin --profile web add ./packages/token-activity-bundle
```

`dsh plugin add` 会把它加入 `dsh.profile.bundles`，随后 `dsh web` 启动时该层被组合进去，「使用量」设置页即出现。

## 前置条件

- 两个插件包已构建（`lib/` 产出）并在 npm 可解析（`^0.1.0`）；本地联调时由 pnpm workspace 链接。
- 其注入的前置服务（`sessionProjections`、`sessionProjectionCache`、`sessionPersistence`、`sessions`）由 `@deepseek-ai/dsh-base` 与 `@deepseek-ai/dsh-web-app` 组合包提供，无需用户手工挂载。

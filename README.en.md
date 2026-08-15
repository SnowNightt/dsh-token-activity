[中文](README.md) | **English**

# DeepSeek Harness Token Consumption Heatmap Plugin

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> A **third-party plugin** for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): displays a daily Token consumption heatmap for the last 365 days. Hover over any date to view all the models used that day and their Token usage.

---

## Plugin Features

- Adds a top-level "Usage" navigation item to the settings interface.
- Two metric cards at the top: cumulative Token and peak Token.
- A daily heatmap of the last 365 local calendar days, with month labels arranged continuously across years.
- Per-day tooltip: date, daily total, and all models used that day with their respective Token usage.
- Historical sessions are automatically backfilled, with real-time backfill progress; a failure in a single session does not affect the whole.

### Preview

![DeepSeek Harness Token Activity Heatmap Preview](docs/images/token-activity-preview.png)

---

## Compatibility

| Component | Verified version |
| --- | --- |
| DeepSeek Harness | `@deepseek-ai/dsh@0.1.0-rc.6` |
| DSH source snapshot | [`47f943859bef`](https://github.com/deepseek-ai/deepseek-harness/commit/47f943859bef60e4160492346772ded9b24f765a) |
| Plugin | `0.1.1` |
| Node.js | `24.18.0` |
| pnpm | `11.7.0` |
| Last verified | `2026-08-15` |

In the environment above, the plugin was verified to install and load successfully, expose the "Usage" entry in the Web settings page, backfill historical session Token data, and render the activity heatmap.

---

## Installation

### Environment Requirements

- Node.js `>=24.0.0`
- pnpm `11.7.0`

If the terminal reports that the `dsh` command cannot be found, first install the DSH CLI globally:

```sh
npm install --global @deepseek-ai/dsh --registry=https://registry.npmjs.org/
```

### Install from npm

Install the npm package:

```sh
dsh plugin --profile web add @snownightt/dsh-token-activity-bundle@0.1.1
```

Restart DeepSeek Harness after installation.

If your DeepSeek Harness is running locally, run the install command in the DeepSeek Harness root directory:

```sh
pnpm dsh plugin --profile web add @snownightt/dsh-token-activity-bundle
```

## Quick Start

1. After installing the plugin, start or restart the DeepSeek Harness Web service:

   ```sh
   dsh web
   ```

   If you are running from the DeepSeek Harness source directory, use:

   ```sh
   pnpm dsh web
   ```

2. Open the DeepSeek Harness Web interface in your browser.Open **Settings**, then select the top-level **Usage** navigation item.

3. When the page is opened for the first time, the plugin automatically backfills historical session data. Wait for the displayed backfill progress to finish. A failure while reading one session does not interrupt the remaining backfill.

4. When the backfill is complete, the page should display:

   - cumulative Token usage;
   - peak daily Token usage;
   - a Token usage heatmap covering the last 365 local calendar days;
   - a tooltip showing the daily total and per-model usage when you hover over a date.

### Verify the Installation

Run the following command to inspect the composed configuration:

```sh
dsh --profile web --dump-config
```

If you are running from the DeepSeek Harness source directory, use:

```sh
pnpm dsh --profile web --dump-config
```

The output should contain both of the following plugin entries:

```text
token-activity
ui-token-activity
```

If both entries are present but **Settings → Usage** does not appear, restart the DeepSeek Harness Web service and refresh the browser page.

## Local Development

If you run DeepSeek Harness locally and have git-cloned this repository, it is recommended to place DeepSeek Harness and this project in the same parent directory.

First install and build the plugin:

```sh
pnpm install --frozen-lockfile
pnpm run test
pnpm run typecheck
pnpm run build
```

Then run the following in the DeepSeek Harness root directory:

```sh
pnpm dsh plugin --profile web add ../dsh-token-activity/packages/token-activity ../dsh-token-activity/packages/ui-token-activity ../dsh-token-activity/packages/token-activity-bundle
```

If DeepSeek Harness and this project are not in the same parent directory, adjust the paths in the install command above accordingly.

The locally developed add-on needs to be re-packaged and then the Deepseek Harness needs to be restarted.

## Uninstall

If installed from npm, run:

```sh
dsh plugin --profile web remove @snownightt/dsh-token-activity-bundle
```
Restart after uninstalling.

---

## PS
This is still under development and may not be perfect in all aspects. Issues are welcome! Thanks!

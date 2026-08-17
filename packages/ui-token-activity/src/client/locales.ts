/**
 * Page copy (FR-01, §7.3), flat string templates with `{name}` placeholders —
 * the shape the Harness locale registry expects (`LocaleDict`). The client
 * `apply` registers these dictionaries and binds a typed translate; the
 * presentational components consume the bound `t`.
 *
 * @module @snownightt/dsh-ui-token-activity/client/locales
 */

export interface TokenActivityLocaleKeys {
  nav: string
  title: string
  metricTotal: string
  metricPeak: string
  metricLongestChat: string
  metricLongestStreak: string
  viewSwitch: string
  viewDaily: string
  viewWeekly: string
  empty: string
  errorTitle: string
  retry: string
  backfill: string
  skipped: string
  coverage: string
  legendLess: string
  legendMore: string
  modelTotalsTitle: string
  modelTotalsCount: string
  modelTotalsTotal: string
}

export type TokenActivityKey = keyof TokenActivityLocaleKeys
export type TokenActivityTranslate = (key: TokenActivityKey, params?: Record<string, unknown>) => string

export const zh: Record<TokenActivityKey, string> = {
  nav: '使用量',
  title: 'Token 活动',
  metricTotal: '累计 Token',
  metricPeak: '峰值 Token',
  metricLongestChat: '最长聊天时长',
  metricLongestStreak: '最长连续天数',
  viewSwitch: '视图切换',
  viewDaily: '每日',
  viewWeekly: '每周',
  empty: '暂无 Token 使用记录',
  errorTitle: '数据读取失败',
  retry: '重试',
  backfill: '正在索引历史会话：已完成 {done} / {total}',
  skipped: '已跳过 {count} 个无法读取的会话',
  coverage: '部分模型调用未报告 Token 用量，统计结果仅包含 Provider 已报告数据。',
  legendLess: '更少',
  legendMore: '更多',
  modelTotalsTitle: '模型 Token 总计（近一年）',
  modelTotalsCount: '共 {count} 个模型',
  modelTotalsTotal: '总计',
}

export const en: Record<TokenActivityKey, string> = {
  nav: 'Usage',
  title: 'Token activity',
  metricTotal: 'Total tokens',
  metricPeak: 'Peak tokens',
  metricLongestChat: 'Longest chat duration',
  metricLongestStreak: 'Longest streak days',
  viewSwitch: 'View mode',
  viewDaily: 'Daily',
  viewWeekly: 'Weekly',
  empty: 'No token usage yet',
  errorTitle: 'Failed to load',
  retry: 'Retry',
  backfill: 'Indexing history: {done} / {total}',
  skipped: '{count} unreadable sessions skipped',
  coverage: 'Some model calls did not report token usage; the summary only includes provider-reported data.',
  legendLess: 'Less',
  legendMore: 'More',
  modelTotalsTitle: 'Model token totals (past year)',
  modelTotalsCount: '{count} models',
  modelTotalsTotal: 'Total',
}

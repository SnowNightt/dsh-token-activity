/**
 * The 总计栏 below the heatmap: every model used in the trailing 365-day
 * window with its total tokens, drawn as a proportional brand-color bar and a
 * compact 万/亿 value (two decimals). Totals are sorted tokens desc (stable
 * rule); the last row sums all models. Exact integers are kept in each row's
 * accessible name so the compact values never lose precision for AT users
 * (mirrors MetricCards).
 *
 * @module @snownightt/dsh-ui-token-activity/client/ModelTotals
 */

import type { TokenActivityModel } from './contract.ts'
import type { TokenActivityTranslate } from './locales.ts'
import { formatInteger, formatWanYiTokens } from './core/format.ts'
import { buildModelTotalLabels, modelTotalKey } from './model-totals.ts'

const BAR_COLOR = 'var(--dsw-heat-3, #4f7dff)'

export interface ModelTotalsProps {
  /** Per-model totals, already sorted by the stable rule (tokens desc). */
  totals: readonly TokenActivityModel[]
  locale: string
  t: TokenActivityTranslate
}

export function ModelTotals({ totals, locale, t }: ModelTotalsProps) {
  if (totals.length === 0) return null

  const labels = buildModelTotalLabels(totals)
  // Sorted tokens desc, so the first row is the widest bar.
  const maxTokens = totals[0]!.tokens
  const grandTotal = totals.reduce((sum, item) => sum + item.tokens, 0)

  return (
    <section
      role="group"
      aria-label={t('modelTotalsTitle')}
      style={{ border: '1px solid var(--dsw-border, #e5e7eb)', borderRadius: 8, padding: '12px 14px' }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{t('modelTotalsTitle')}</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>{t('modelTotalsCount', { count: totals.length })}</div>
      </div>

      {totals.map(item => {
        const key = modelTotalKey(item.provider, item.model)
        const label = labels.get(key) ?? item.model
        const width = maxTokens > 0 ? `${Math.round((item.tokens / maxTokens) * 100)}%` : '0%'
        return (
          <div
            key={key}
            role="status"
            aria-label={`${label}: ${formatInteger(item.tokens, locale)} tokens`}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}
          >
            <span
              style={{
                flex: '0 1 34%',
                minWidth: 96,
                fontSize: 12,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={label}
            >
              {label}
            </span>
            <div aria-hidden="true" style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--dsw-border, #e5e7eb)', overflow: 'hidden' }}>
              <div style={{ width, height: '100%', borderRadius: 4, background: BAR_COLOR }} />
            </div>
            <span
              style={{
                flex: '0 0 88px',
                textAlign: 'right',
                fontSize: 12,
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatWanYiTokens(item.tokens, locale)}
            </span>
          </div>
        )
      })}

      <div
        role="status"
        aria-label={`${t('modelTotalsTotal')}: ${formatInteger(grandTotal, locale)} tokens`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          borderTop: '1px solid var(--dsw-border, #e5e7eb)',
          marginTop: 8,
          paddingTop: 8,
        }}
      >
        <span style={{ fontSize: 12, opacity: 0.7 }}>{t('modelTotalsTotal')}</span>
        <span style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {formatWanYiTokens(grandTotal, locale)}
        </span>
      </div>
    </section>
  )
}

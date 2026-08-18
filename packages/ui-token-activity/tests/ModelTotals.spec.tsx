// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ModelTotals } from '../src/client/ModelTotals.tsx'
import { zh, en } from '../src/client/locales.ts'
import type { TokenActivityKey, TokenActivityTranslate } from '../src/client/locales.ts'
import type { TokenActivityModel } from '../src/client/contract.ts'

function makeT(dict: Record<TokenActivityKey, string>): TokenActivityTranslate {
  return (key, params) => {
    const template = dict[key]
    return params === undefined
      ? template
      : template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''))
  }
}

const totals: TokenActivityModel[] = [
  { provider: 'deepseek', model: 'deepseek-reasoner', tokens: 123_456_789 },
  { provider: 'deepseek', model: 'deepseek-chat', tokens: 45_678 },
  { provider: 'openai', model: 'deepseek-chat', tokens: 9_999 },
]

describe('ModelTotals (总计栏)', () => {
  it('renders nothing for an empty totals list', () => {
    const { container } = render(<ModelTotals totals={[]} locale="zh-CN" t={makeT(zh)} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the title, model count and one row per model with 万/亿 values', () => {
    render(<ModelTotals totals={totals} locale="zh-CN" t={makeT(zh)} />)
    expect(screen.getByText('模型 Token 总计（近一年）')).toBeTruthy()
    expect(screen.getByText('共 3 个模型')).toBeTruthy()
    expect(screen.getByText('1.23亿')).toBeTruthy()
    expect(screen.getByText('4.57万')).toBeTruthy()
    // Below 1万 the raw integer is shown.
    expect(screen.getByText('9,999')).toBeTruthy()
  })

  it('disambiguates a model name shared by two providers', () => {
    render(<ModelTotals totals={totals} locale="zh-CN" t={makeT(zh)} />)
    expect(screen.getByText('deepseek · deepseek-chat')).toBeTruthy()
    expect(screen.getByText('openai · deepseek-chat')).toBeTruthy()
    expect(screen.getByText('deepseek-reasoner')).toBeTruthy()
  })

  it('renders a 总计 row summing every model', () => {
    render(<ModelTotals totals={totals} locale="zh-CN" t={makeT(zh)} />)
    // 123_456_789 + 45_678 + 9_999 = 123_512_466 → 1.24亿
    expect(screen.getByText('1.24亿')).toBeTruthy()
    expect(screen.getByRole('status', { name: '总计: 123,512,466 tokens' })).toBeTruthy()
  })

  it('keeps exact integers in each row accessible name', () => {
    render(<ModelTotals totals={totals} locale="zh-CN" t={makeT(zh)} />)
    expect(screen.getByRole('status', { name: 'deepseek-reasoner: 123,456,789 tokens' })).toBeTruthy()
    expect(screen.getByRole('status', { name: 'deepseek · deepseek-chat: 45,678 tokens' })).toBeTruthy()
  })

  it('keeps 万/亿 units and English copy in the en locale', () => {
    render(<ModelTotals totals={totals} locale="en-US" t={makeT(en)} />)
    expect(screen.getByText('Model token totals (past year)')).toBeTruthy()
    expect(screen.getByText('3 models')).toBeTruthy()
    expect(screen.getByText('Total')).toBeTruthy()
    expect(screen.getByText('1.23亿')).toBeTruthy()
    expect(screen.getByRole('status', { name: 'Total: 123,512,466 tokens' })).toBeTruthy()
  })
})

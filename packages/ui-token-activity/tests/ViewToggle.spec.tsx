// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ViewToggle } from '../src/client/ViewToggle.tsx'
import { en, zh } from '../src/client/locales.ts'
import type { TokenActivityKey, TokenActivityTranslate } from '../src/client/locales.ts'

function makeT(locale: 'zh' | 'en'): TokenActivityTranslate {
  const dict = locale === 'zh' ? zh : en
  return (key: TokenActivityKey, params) => {
    const template = dict[key]
    return params === undefined
      ? template
      : template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''))
  }
}

describe('ViewToggle (US-01)', () => {
  it('renders Daily and Weekly options with Daily selected by default', () => {
    render(<ViewToggle view="daily" onChange={() => {}} t={makeT('zh')} />)
    expect(screen.getByRole('button', { name: '每日' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: '每周' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('marks the weekly option pressed when active', () => {
    render(<ViewToggle view="weekly" onChange={() => {}} t={makeT('zh')} />)
    expect(screen.getByRole('button', { name: '每周' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: '每日' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('notifies the parent on switch', () => {
    const onChange = vi.fn()
    render(<ViewToggle view="daily" onChange={onChange} t={makeT('zh')} />)
    fireEvent.click(screen.getByRole('button', { name: '每周' }))
    expect(onChange).toHaveBeenCalledWith('weekly')
  })

  it('labels the group for screen readers', () => {
    render(<ViewToggle view="daily" onChange={() => {}} t={makeT('zh')} />)
    expect(screen.getByRole('group', { name: '视图切换' })).toBeTruthy()
  })

  it('renders English copy', () => {
    render(<ViewToggle view="daily" onChange={() => {}} t={makeT('en')} />)
    expect(screen.getByRole('button', { name: 'Daily' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Weekly' })).toBeTruthy()
  })
})

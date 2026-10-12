// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import {
  buttonKinds,
  COPIED_MS,
  dividerKinds,
  pillKinds,
  SwButton,
  SwCard,
  SwDivider,
  SwInput,
  SwPill,
  SwStatusPill,
  SwTerminalSnippet,
  statuses
} from '../../../packages/ui-vue/src/index.ts'

describe('SwButton', () => {
  it.each(buttonKinds)('kind %s - render - pill classes and a native button', (kind) => {
    const w = mount(SwButton, { props: { kind }, slots: { default: 'Start' } })
    expect(w.element.tagName).toBe('BUTTON')
    expect(w.classes()).toEqual(['sw-button', `sw-button--${kind}`, 'sw-button--md'])
    expect(w.attributes('type')).toBe('button')
    expect(w.text()).toBe('Start')
  })

  it('enabled - click - emits click', async () => {
    const w = mount(SwButton)
    await w.trigger('click')
    expect(w.emitted('click')).toHaveLength(1)
  })

  it('disabled - click - native disabled and no click event', async () => {
    const w = mount(SwButton, { props: { disabled: true } })
    expect(w.attributes('disabled')).toBeDefined()
    await w.trigger('click')
    expect(w.emitted('click')).toBeUndefined()
  })

  it('enabled - focus - takes keyboard focus', () => {
    const w = mount(SwButton, { attachTo: document.body })
    ;(w.element as HTMLElement).focus()
    expect(document.activeElement).toBe(w.element)
    w.unmount()
  })
})

describe('SwPill', () => {
  it.each(pillKinds)('kind %s - render - span with kind class', (kind) => {
    const w = mount(SwPill, { props: { kind }, slots: { default: 'TypeScript' } })
    expect(w.element.tagName).toBe('SPAN')
    expect(w.classes()).toContain(`sw-pill--${kind}`)
  })

  it('as button - click - emits click', async () => {
    const w = mount(SwPill, { props: { as: 'button' } })
    expect(w.element.tagName).toBe('BUTTON')
    await w.trigger('click')
    expect(w.emitted('click')).toHaveLength(1)
  })

  it('as button disabled - click - no click event', async () => {
    const w = mount(SwPill, { props: { as: 'button', disabled: true } })
    expect(w.attributes('disabled')).toBeDefined()
    expect(w.classes()).toContain('sw-is-disabled')
    await w.trigger('click')
    expect(w.emitted('click')).toBeUndefined()
  })

  it('span disabled - render - aria-disabled', () => {
    const w = mount(SwPill, { props: { disabled: true } })
    expect(w.attributes('aria-disabled')).toBe('true')
  })
})

describe('SwStatusPill', () => {
  it.each(statuses)('status %s - render - status class and a text label', (status) => {
    const w = mount(SwStatusPill, { props: { status } })
    expect(w.classes()).toContain(`sw-status-pill--${status}`)
    expect(w.text()).toBe(status[0]?.toUpperCase() + status.slice(1))
  })

  it('slot - render - slot replaces the label', () => {
    const w = mount(SwStatusPill, { props: { status: 'live' }, slots: { default: 'On dev' } })
    expect(w.text()).toBe('On dev')
  })

  it('disabled - render - disabled class', () => {
    const w = mount(SwStatusPill, { props: { status: 'planned', disabled: true } })
    expect(w.classes()).toContain('sw-is-disabled')
  })
})

describe('SwInput', () => {
  it('v-model - type - emits update:modelValue', async () => {
    const w = mount(SwInput, { props: { modelValue: '' } })
    await w.setValue('vm@example.com')
    expect(w.emitted('update:modelValue')?.[0]).toEqual(['vm@example.com'])
  })

  it('invalid - render - aria-invalid', () => {
    const w = mount(SwInput, { props: { invalid: true } })
    expect(w.attributes('aria-invalid')).toBe('true')
  })

  it('attrs - render - placeholder and id fall through', () => {
    const w = mount(SwInput, { attrs: { id: 'email', placeholder: 'you@example.com' } })
    expect(w.attributes('id')).toBe('email')
    expect(w.attributes('placeholder')).toBe('you@example.com')
  })

  it('disabled - render - native disabled', () => {
    const w = mount(SwInput, { props: { disabled: true } })
    expect(w.attributes('disabled')).toBeDefined()
  })
})

describe('SwCard', () => {
  it('content - render - article with eyebrow, title, body and footer', () => {
    const w = mount(SwCard, {
      props: { eyebrow: '// Service', title: 'Vision' },
      slots: {
        default: 'Image labels per tenant.',
        footer: () => h(SwStatusPill, { status: 'building' })
      }
    })
    expect(w.element.tagName).toBe('ARTICLE')
    expect(w.find('.sw-card__eyebrow').text()).toBe('// Service')
    expect(w.find('.sw-card__title').text()).toBe('Vision')
    expect(w.find('.sw-card__body').text()).toBe('Image labels per tenant.')
    expect(w.find('.sw-card__footer .sw-status-pill--building').exists()).toBe(true)
  })

  it('href - render - link card', () => {
    const w = mount(SwCard, { props: { href: '/vision', title: 'Vision' } })
    expect(w.element.tagName).toBe('A')
    expect(w.attributes('href')).toBe('/vision')
  })

  it('href disabled - render - no href and aria-disabled', () => {
    const w = mount(SwCard, { props: { href: '/vision', disabled: true } })
    expect(w.attributes('href')).toBeUndefined()
    expect(w.attributes('aria-disabled')).toBe('true')
    expect(w.classes()).toContain('sw-is-disabled')
  })
})

describe('SwDivider', () => {
  it.each(dividerKinds)('kind %s - render - separator semantics', (kind) => {
    const w = mount(SwDivider, { props: { kind } })
    expect(w.classes()).toContain(`sw-divider--${kind}`)
    if (kind === 'line') expect(w.element.tagName).toBe('HR')
    else expect(w.attributes('role')).toBe('separator')
  })

  it('label - render - label text', () => {
    expect(mount(SwDivider, { props: { kind: 'label', label: 'or' } }).text()).toBe('or')
  })

  it('vertical - render - vertical orientation', () => {
    const w = mount(SwDivider, { props: { kind: 'vertical' } })
    expect(w.attributes('aria-orientation')).toBe('vertical')
  })

  it('disabled - render - disabled class', () => {
    expect(mount(SwDivider, { props: { disabled: true } }).classes()).toContain('sw-is-disabled')
  })
})

describe('SwTerminalSnippet', () => {
  it('command - copy - writes the command and emits copy', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const w = mount(SwTerminalSnippet, { props: { command: 'npm i @synthwerk/tokens' } })
    expect(w.find('.sw-terminal__command').text()).toBe('npm i @synthwerk/tokens')
    await w.find('.sw-terminal__copy').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith('npm i @synthwerk/tokens')
    expect(w.emitted('copy')?.[0]).toEqual(['npm i @synthwerk/tokens'])
    expect(w.find('.sw-terminal__copy').text()).toBe('Copied')
    vi.unstubAllGlobals()
  })

  it('command disabled - copy - no write and no event', async () => {
    const writeText = vi.fn()
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const w = mount(SwTerminalSnippet, { props: { command: 'ls', disabled: true } })
    expect(w.find('.sw-terminal__copy').attributes('disabled')).toBeDefined()
    await w.find('.sw-terminal__copy').trigger('click')
    expect(writeText).not.toHaveBeenCalled()
    expect(w.emitted('copy')).toBeUndefined()
    vi.unstubAllGlobals()
  })

  it('copied - after COPIED_MS - label returns to Copy', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
    const w = mount(SwTerminalSnippet, { props: { command: 'ls' } })
    await w.find('.sw-terminal__copy').trigger('click')
    await flushPromises()
    expect(w.find('.sw-terminal__copy').text()).toBe('Copied')
    vi.advanceTimersByTime(COPIED_MS)
    await nextTick()
    expect(w.find('.sw-terminal__copy').text()).toBe('Copy')
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('clipboard denied - copy - no event and no rejection', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) }
    })
    const w = mount(SwTerminalSnippet, { props: { command: 'ls' } })
    await w.find('.sw-terminal__copy').trigger('click')
    await flushPromises()
    expect(w.emitted('copy')).toBeUndefined()
    expect(w.find('.sw-terminal__copy').text()).toBe('Copy')
    vi.unstubAllGlobals()
  })

  it('empty command - render - no copy button', () => {
    expect(mount(SwTerminalSnippet).find('.sw-terminal__copy').exists()).toBe(false)
  })

  it('no clipboard - copy - no event', async () => {
    vi.stubGlobal('navigator', {})
    const w = mount(SwTerminalSnippet, { props: { command: 'ls' } })
    await w.find('.sw-terminal__copy').trigger('click')
    expect(w.emitted('copy')).toBeUndefined()
    vi.unstubAllGlobals()
  })

  it('lines - render - session with chrome and toned lines', () => {
    const w = mount(SwTerminalSnippet, {
      props: {
        title: '~/synthwerk — zsh',
        lines: [{ text: '$ pnpm check' }, { text: 'all passed', tone: 'success' }]
      }
    })
    expect(w.classes()).toContain('sw-terminal--session')
    expect(w.findAll('.sw-terminal__dot')).toHaveLength(3)
    expect(w.find('.sw-terminal__title').text()).toBe('~/synthwerk — zsh')
    expect(w.findAll('.sw-terminal__line')).toHaveLength(2)
    expect(w.find('.sw-terminal__line--success').text()).toBe('all passed')
  })
})

describe('tokens only - render - no inline style on any component', () => {
  it.each([
    ['button', () => mount(SwButton)],
    ['pill', () => mount(SwPill)],
    ['status pill', () => mount(SwStatusPill, { props: { status: 'live' } })],
    ['input', () => mount(SwInput)],
    ['card', () => mount(SwCard, { props: { title: 'x' }, slots: { default: 'y' } })],
    ['divider', () => mount(SwDivider, { props: { kind: 'label' } })],
    ['terminal', () => mount(SwTerminalSnippet, { props: { command: 'ls' } })]
  ])('%s', (_name, make) => {
    expect(make().html()).not.toContain('style=')
  })
})

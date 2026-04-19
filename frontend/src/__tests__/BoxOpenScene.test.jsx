/**
 * Tests for BoxOpenScene — the cinematic box opening component.
 *
 * We test the state machine transitions without waiting for real timers
 * (vitest's fake-timer support) and verify that the correct phase
 * content is rendered at each stage.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BoxOpenScene from '../components/BoxOpenScene'
import { I18nProvider } from '../i18n/index'
import { ThemeProvider } from '../context/ThemeContext'

// ── Helpers ───────────────────────────────────────────────────────────────────

const SHAKE_MS  = 700
const BURST_MS  = 500
const REEL_MS   = 5200
const TOTAL_ANIM = SHAKE_MS + BURST_MS + REEL_MS + 400

function makeItem(id, name, rarity = 'common', value = 10) {
  return {
    id,
    weight: 50,
    product: {
      id,
      name,
      brand: 'TestBrand',
      rarity,
      retail_value: value,
      image_url: `https://example.com/${id}.jpg`,
    },
  }
}

const ITEMS = [
  makeItem(1, 'Rare Phone',   'rare',   200),
  makeItem(2, 'Common Case',  'common',  10),
  makeItem(3, 'Epic Headset', 'epic',   150),
]

function Wrapper({ children }) {
  return (
    <MemoryRouter>
      <I18nProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </I18nProvider>
    </MemoryRouter>
  )
}

function renderScene(animData = null, onFinish = vi.fn()) {
  const box = {
    id: 1,
    name: 'Test Box',
    image_url: 'https://example.com/box.jpg',
    items: ITEMS,
  }
  return render(
    <Wrapper>
      <BoxOpenScene box={box} animData={animData} onFinish={onFinish} />
    </Wrapper>,
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BoxOpenScene — IDLE phase', () => {
  it('renders all items in the grid before opening', () => {
    renderScene()
    ITEMS.forEach(item => {
      expect(screen.getByAltText(item.product.name)).toBeInTheDocument()
    })
  })

  it('shows item values', () => {
    renderScene()
    expect(screen.getByText('$200.00')).toBeInTheDocument()
    expect(screen.getByText('$10.00')).toBeInTheDocument()
  })

  it('shows probability percentages', () => {
    renderScene()
    // 3 items with equal weight → each ~33.3%
    const pcts = screen.getAllByText(/33\.\d%/)
    expect(pcts.length).toBeGreaterThanOrEqual(1)
  })

  it('does NOT show reel in idle', () => {
    renderScene()
    // Reel wrapper is only shown during REELING phase
    expect(document.querySelector('.reel-wrapper')).toBeNull()
  })
})


describe('BoxOpenScene — Animation phases', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(()  => { vi.useRealTimers() })

  const ANIM_DATA = { items: ITEMS, winnerId: 2 }

  it('enters SHAKING phase immediately when animData arrives', async () => {
    const { rerender } = renderScene()

    await act(async () => {
      rerender(
        <Wrapper>
          <BoxOpenScene
            box={{ id: 1, name: 'Test Box', image_url: 'https://example.com/box.jpg', items: ITEMS }}
            animData={ANIM_DATA}
            onFinish={vi.fn()}
          />
        </Wrapper>,
      )
    })

    expect(document.querySelector('.scene-box-shake')).not.toBeNull()
  })

  it('transitions to BURSTING after SHAKE_MS', async () => {
    const { rerender } = renderScene()

    await act(async () => {
      rerender(
        <Wrapper>
          <BoxOpenScene
            box={{ id: 1, name: 'Test Box', image_url: 'https://example.com/box.jpg', items: ITEMS }}
            animData={ANIM_DATA}
            onFinish={vi.fn()}
          />
        </Wrapper>,
      )
    })

    await act(async () => { vi.advanceTimersByTime(SHAKE_MS + 10) })
    expect(document.querySelector('.scene-box-burst')).not.toBeNull()
  })

  it('shows reel during REELING phase', async () => {
    const { rerender } = renderScene()

    await act(async () => {
      rerender(
        <Wrapper>
          <BoxOpenScene
            box={{ id: 1, name: 'Test Box', image_url: 'https://example.com/box.jpg', items: ITEMS }}
            animData={ANIM_DATA}
            onFinish={vi.fn()}
          />
        </Wrapper>,
      )
    })

    await act(async () => { vi.advanceTimersByTime(SHAKE_MS + BURST_MS + 10) })
    expect(document.querySelector('.reel-wrapper')).not.toBeNull()
  })

  it('shows winner card during REVEALING phase', async () => {
    const { rerender } = renderScene()

    await act(async () => {
      rerender(
        <Wrapper>
          <BoxOpenScene
            box={{ id: 1, name: 'Test Box', image_url: 'https://example.com/box.jpg', items: ITEMS }}
            animData={ANIM_DATA}
            onFinish={vi.fn()}
          />
        </Wrapper>,
      )
    })

    await act(async () => { vi.advanceTimersByTime(TOTAL_ANIM + 10) })
    expect(document.querySelector('.scene-winner-card')).not.toBeNull()
  })

  it('calls onFinish after reveal completes', async () => {
    const onFinish = vi.fn()
    const { rerender } = renderScene()

    await act(async () => {
      rerender(
        <Wrapper>
          <BoxOpenScene
            box={{ id: 1, name: 'Test Box', image_url: 'https://example.com/box.jpg', items: ITEMS }}
            animData={ANIM_DATA}
            onFinish={onFinish}
          />
        </Wrapper>,
      )
    })

    await act(async () => { vi.advanceTimersByTime(TOTAL_ANIM + 1100) })
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  it('cleans up timers on unmount', async () => {
    const onFinish = vi.fn()
    const { rerender, unmount } = renderScene()

    await act(async () => {
      rerender(
        <Wrapper>
          <BoxOpenScene
            box={{ id: 1, name: 'Test Box', image_url: 'https://example.com/box.jpg', items: ITEMS }}
            animData={ANIM_DATA}
            onFinish={onFinish}
          />
        </Wrapper>,
      )
    })

    unmount()
    await act(async () => { vi.advanceTimersByTime(TOTAL_ANIM + 2000) })
    // onFinish should NOT have been called after unmount
    expect(onFinish).not.toHaveBeenCalled()
  })
})

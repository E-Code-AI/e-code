import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'
import { useBreakpoint, useIsMobile } from '../use-breakpoint'

// Mock window.matchMedia since it's not available in jsdom
const mockMatchMedia = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
})

// Mock window object for resize events
let mockInnerWidth = 1024
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: mockInnerWidth,
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(mockMatchMedia),
})

describe('useBreakpoint Hook', () => {
  beforeEach(() => {
    mockInnerWidth = 1024
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: mockInnerWidth,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should return correct breakpoint state for desktop', () => {
    const { result } = renderHook(() => useBreakpoint())
    
    expect(result.current.width).toBe(1024)
    expect(result.current.isMobile).toBe(false)
    expect(result.current.isTablet).toBe(false)
    expect(result.current.isDesktop).toBe(true)
  })

  it('should return correct breakpoint state for mobile', () => {
    mockInnerWidth = 500
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: mockInnerWidth,
    })

    const { result } = renderHook(() => useBreakpoint())
    
    expect(result.current.width).toBe(500)
    expect(result.current.isMobile).toBe(true)
    expect(result.current.isTablet).toBe(false)
    expect(result.current.isDesktop).toBe(false)
  })

  it('should return correct breakpoint state for tablet', () => {
    mockInnerWidth = 800
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: mockInnerWidth,
    })

    const { result } = renderHook(() => useBreakpoint())
    
    expect(result.current.width).toBe(800)
    expect(result.current.isMobile).toBe(false)
    expect(result.current.isTablet).toBe(true)
    expect(result.current.isDesktop).toBe(false)
  })

  it('should handle edge breakpoint values correctly', () => {
    // Test exact boundary at 640px (mobile/tablet boundary)
    mockInnerWidth = 639
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: mockInnerWidth,
    })

    const { result: result639 } = renderHook(() => useBreakpoint())
    expect(result639.current.isMobile).toBe(true)
    expect(result639.current.isTablet).toBe(false)

    // Test exact boundary at 640px 
    mockInnerWidth = 640
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: mockInnerWidth,
    })

    const { result: result640 } = renderHook(() => useBreakpoint())
    expect(result640.current.isMobile).toBe(false)
    expect(result640.current.isTablet).toBe(true)

    // Test exact boundary at 1023px (tablet/desktop boundary)
    mockInnerWidth = 1023
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: mockInnerWidth,
    })

    const { result: result1023 } = renderHook(() => useBreakpoint())
    expect(result1023.current.isTablet).toBe(true)
    expect(result1023.current.isDesktop).toBe(false)

    // Test exact boundary at 1024px
    mockInnerWidth = 1024
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: mockInnerWidth,
    })

    const { result: result1024 } = renderHook(() => useBreakpoint())
    expect(result1024.current.isTablet).toBe(false)
    expect(result1024.current.isDesktop).toBe(true)
  })

  it('should update state on window resize', () => {
    const { result } = renderHook(() => useBreakpoint())
    
    // Initially desktop
    expect(result.current.isDesktop).toBe(true)
    
    // Simulate resize to mobile
    act(() => {
      mockInnerWidth = 500
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: mockInnerWidth,
      })
      window.dispatchEvent(new Event('resize'))
    })
    
    expect(result.current.isMobile).toBe(true)
    expect(result.current.isDesktop).toBe(false)
  })
})

describe('useIsMobile Hook', () => {
  it('should return boolean value for mobile detection', () => {
    const { result } = renderHook(() => useIsMobile())
    
    expect(typeof result.current).toBe('boolean')
  })

  it('should maintain backward compatibility', () => {
    mockInnerWidth = 500
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: mockInnerWidth,
    })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })
})
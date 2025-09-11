import * as React from "react"

// Breakpoint definitions aligned with Tailwind and requirements
const BREAKPOINTS = {
  mobile: 640,    // < 640px (sm) 
  tablet: 1024,   // 640px - 1023px (sm to lg boundary)
  desktop: 1024,  // >= 1024px (lg)
} as const

export interface BreakpointState {
  width: number
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

export function useBreakpoint(): BreakpointState {
  const [state, setState] = React.useState<BreakpointState>(() => {
    // Initialize with safe defaults for SSR
    if (typeof window === 'undefined') {
      return {
        width: 1024,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
      }
    }

    const width = window.innerWidth
    return {
      width,
      isMobile: width < BREAKPOINTS.mobile,
      isTablet: width >= BREAKPOINTS.mobile && width < BREAKPOINTS.desktop,
      isDesktop: width >= BREAKPOINTS.desktop,
    }
  })

  React.useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth
      setState({
        width,
        isMobile: width < BREAKPOINTS.mobile,
        isTablet: width >= BREAKPOINTS.mobile && width < BREAKPOINTS.desktop,
        isDesktop: width >= BREAKPOINTS.desktop,
      })
    }

    // Set initial value
    updateBreakpoint()

    // Listen for resize events
    window.addEventListener('resize', updateBreakpoint)
    
    return () => window.removeEventListener('resize', updateBreakpoint)
  }, [])

  return state
}

// Backward compatibility wrapper for useIsMobile
export function useIsMobile(): boolean {
  const { isMobile } = useBreakpoint()
  return isMobile
}
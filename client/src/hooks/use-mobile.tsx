import * as React from "react"

const MOBILE_BREAKPOINT = 768
const MOBILE_LANDSCAPE_MAX_HEIGHT = 500
const TABLET_MIN_WIDTH = 768
const TABLET_MAX_WIDTH = 1024

// Detects if device is a phone (portrait or landscape) vs tablet/desktop
// Mobile landscape: width > 768 but height < 500 (phone rotated)
// Tablet portrait: width 768-1024 but height > 500 (actual tablet)
function detectMobileDevice(width: number, height: number): boolean {
  // Portrait mobile: narrow width
  if (width < MOBILE_BREAKPOINT) {
    return true
  }
  
  // Landscape mobile: medium width but short height (phone in landscape)
  // This distinguishes phone landscape from tablet portrait
  if (width >= TABLET_MIN_WIDTH && width <= TABLET_MAX_WIDTH && height < MOBILE_LANDSCAPE_MAX_HEIGHT) {
    return true
  }
  
  // Wider landscape mobile (larger phones like iPhone Max)
  if (width > TABLET_MAX_WIDTH && height < MOBILE_LANDSCAPE_MAX_HEIGHT) {
    return true
  }
  
  return false
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(detectMobileDevice(window.innerWidth, window.innerHeight))
    }
    
    // Listen for both resize and orientation changes
    window.addEventListener("resize", checkMobile)
    window.addEventListener("orientationchange", checkMobile)
    
    // Initial check
    checkMobile()
    
    return () => {
      window.removeEventListener("resize", checkMobile)
      window.removeEventListener("orientationchange", checkMobile)
    }
  }, [])

  return !!isMobile
}

// Additional hook for detailed device type detection
export interface DeviceInfo {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isLandscape: boolean
  isMobileLandscape: boolean
  isTabletLandscape: boolean
}

export function useDeviceInfo(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = React.useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isLandscape: false,
    isMobileLandscape: false,
    isTabletLandscape: false,
  })

  React.useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const isLandscape = width > height
      
      // Mobile: phone in any orientation
      const isMobile = detectMobileDevice(width, height)
      
      // Mobile landscape: phone in landscape specifically
      const isMobileLandscape = isMobile && isLandscape
      
      // Tablet: medium width with tall height (not a phone in landscape)
      const isTablet = !isMobile && width >= TABLET_MIN_WIDTH && width <= TABLET_MAX_WIDTH
      
      // Tablet landscape
      const isTabletLandscape = isTablet && isLandscape
      
      // Desktop: large screens
      const isDesktop = width > TABLET_MAX_WIDTH && height >= MOBILE_LANDSCAPE_MAX_HEIGHT
      
      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        isLandscape,
        isMobileLandscape,
        isTabletLandscape,
      })
    }
    
    window.addEventListener("resize", updateDeviceInfo)
    window.addEventListener("orientationchange", updateDeviceInfo)
    
    updateDeviceInfo()
    
    return () => {
      window.removeEventListener("resize", updateDeviceInfo)
      window.removeEventListener("orientationchange", updateDeviceInfo)
    }
  }, [])

  return deviceInfo
}

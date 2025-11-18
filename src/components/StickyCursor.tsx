'use client'

import { useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

// Import Kursor.js CSS
import 'kursor/dist/kursor.css'

interface StickyCursorProps {
  type?: 1 | 2 | 3 | 4
  removeDefaultCursor?: boolean
}

export default function StickyCursor({
  type = 2,
  removeDefaultCursor = true
}: StickyCursorProps) {
  const { actualTheme } = useTheme()

  // Set cursor color based on theme
  const cursorColor = actualTheme === 'dark' ? '#00b3d6' : '#00b3d6'

  useEffect(() => {
    // Dynamically import Kursor.js to avoid SSR issues
    const loadKursor = async () => {
      try {
        // Import Kursor library
        const kursorModule = await import('kursor/dist/kursor.js')

        // @ts-expect-error - kursor doesn't have TypeScript definitions
        const Kursor = kursorModule.default || kursorModule.kursor || window.kursor

        if (Kursor) {
          // Initialize Kursor with configuration optimized for performance
          new Kursor({
            type: type,
            color: cursorColor,
            removeDefaultCursor: removeDefaultCursor,
            // Performance optimizations
            skewing: 0, // Disable skewing for better performance
            skewingText: 0,
            skewingIcon: 0,
            skewingMedia: 0,
            skewingDelta: 0,
            skewingDeltaMax: 0,
          })

          console.log('Kursor.js initialized successfully with type:', type, 'color:', cursorColor)
        } else {
          console.error('Kursor constructor not found')
        }
      } catch (error) {
        console.error('Failed to load Kursor.js:', error)
      }
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      loadKursor()
    }, 100)

    // Cleanup function
    return () => {
      clearTimeout(timer)
      // Remove kursor elements if they exist
      const kursorElements = document.querySelectorAll('[class*="kursor"]')
      kursorElements.forEach(el => el.remove())
    }
  }, [type, cursorColor, removeDefaultCursor])

  return null // This component doesn't render anything visible
}

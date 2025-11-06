'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion'
import { useTheme } from '@/contexts/ThemeContext'

interface StickyCursorProps {
  stickyElement?: string // CSS selector for sticky elements
}

export default function StickyCursor({ stickyElement = '[data-cursor-sticky]' }: StickyCursorProps) {
  const cursorRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [cursorText, setCursorText] = useState('')
  const { actualTheme } = useTheme()
  
  // Motion values for smooth cursor movement
  const cursorX = useMotionValue(-100)
  const cursorY = useMotionValue(-100)
  
  // Spring physics for smooth, natural movement with liquid feel
  const springConfig = { damping: 20, stiffness: 200, mass: 0.8 }
  const cursorXSpring = useSpring(cursorX, springConfig)
  const cursorYSpring = useSpring(cursorY, springConfig)
  
  // Scale for hover effect
  const cursorScale = useMotionValue(1)
  const cursorScaleSpring = useSpring(cursorScale, { damping: 12, stiffness: 250 })

  // Theme-based colors
  const isDark = actualTheme === 'dark'
  const glassColors = {
    light: {
      bg: 'rgba(255, 255, 255, 0.15)',
      border: 'rgba(0, 0, 0, 0.2)',
      text: 'rgb(0, 0, 0)',
      glow: 'rgba(0, 0, 0, 0.1)',
      hoverBg: 'rgba(255, 255, 255, 0.25)',
      hoverBorder: 'rgba(0, 0, 0, 0.3)',
    },
    dark: {
      bg: 'rgba(255, 255, 255, 0.08)',
      border: 'rgba(255, 255, 255, 0.2)',
      text: 'rgb(255, 255, 255)',
      glow: 'rgba(255, 255, 255, 0.15)',
      hoverBg: 'rgba(255, 255, 255, 0.15)',
      hoverBorder: 'rgba(255, 255, 255, 0.4)',
    }
  }

  const colors = isDark ? glassColors.dark : glassColors.light

  useEffect(() => {
    // Show cursor after mount
    setIsVisible(true)

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const stickyElements = document.querySelectorAll(stickyElement)
      
      let isSticky = false
      let stickyBounds: DOMRect | null = null
      
      // Check if hovering over a sticky element
      stickyElements.forEach((element) => {
        if (element.contains(target)) {
          isSticky = true
          stickyBounds = element.getBoundingClientRect()
          const text = element.getAttribute('data-cursor-text')
          if (text) setCursorText(text)
        }
      })
      
      if (isSticky && stickyBounds) {
        // Magnetic effect - cursor sticks to center of element
        const centerX = stickyBounds.left + stickyBounds.width / 2
        const centerY = stickyBounds.top + stickyBounds.height / 2
        
        // Calculate distance from cursor to center
        const distanceX = e.clientX - centerX
        const distanceY = e.clientY - centerY
        
        // Apply magnetic pull (reduce distance by factor)
        const magnetStrength = 0.35
        cursorX.set(centerX + distanceX * magnetStrength)
        cursorY.set(centerY + distanceY * magnetStrength)
        
        setIsHovering(true)
        cursorScale.set(1.8)
      } else {
        // Normal cursor following
        cursorX.set(e.clientX)
        cursorY.set(e.clientY)
        setIsHovering(false)
        setCursorText('')
        cursorScale.set(1)
      }
    }

    const handleMouseEnter = () => setIsVisible(true)
    const handleMouseLeave = () => setIsVisible(false)

    window.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseenter', handleMouseEnter)
    document.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseenter', handleMouseEnter)
      document.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [stickyElement, cursorX, cursorY, cursorScale])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={cursorRef}
          className="fixed top-0 left-0 pointer-events-none z-[9999]"
          style={{
            x: cursorXSpring,
            y: cursorYSpring,
            translateX: '-50%',
            translateY: '-50%',
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
        >
          {/* Outer glow - water ripple effect */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
              filter: 'blur(25px)',
              scale: cursorScaleSpring,
            }}
            animate={{
              width: isHovering ? 140 : 70,
              height: isHovering ? 140 : 70,
              opacity: [0.6, 0.8, 0.6],
            }}
            transition={{ 
              width: { duration: 0.5, ease: 'easeOut' },
              height: { duration: 0.5, ease: 'easeOut' },
              opacity: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
            }}
          />
          
          {/* Main liquid cursor */}
          <motion.div
            className="relative flex items-center justify-center"
            style={{ scale: cursorScaleSpring }}
          >
            {/* Liquid glass container - no border */}
            <motion.div
              className="rounded-full relative overflow-hidden"
              style={{
                background: isHovering ? colors.hoverBg : colors.bg,
                backdropFilter: 'blur(16px) saturate(200%)',
                WebkitBackdropFilter: 'blur(16px) saturate(200%)',
                boxShadow: isHovering 
                  ? `0 12px 40px 0 ${colors.glow}, inset 0 2px 4px rgba(255, 255, 255, 0.15)`
                  : `0 6px 20px 0 ${colors.glow}, inset 0 1px 2px rgba(255, 255, 255, 0.1)`,
              }}
              animate={{
                width: isHovering ? 110 : 52,
                height: isHovering ? 110 : 52,
                borderRadius: isHovering ? '50%' : '50%',
              }}
              transition={{ 
                duration: 0.5, 
                ease: [0.34, 1.56, 0.64, 1],
              }}
            >
              {/* Water wave effect 1 */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${colors.glow} 0%, transparent 60%)`,
                  opacity: 0.4,
                }}
                animate={{
                  scale: [1, 1.2, 1],
                  x: [0, 10, 0],
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              
              {/* Water wave effect 2 */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle at 70% 70%, ${colors.glow} 0%, transparent 60%)`,
                  opacity: 0.3,
                }}
                animate={{
                  scale: [1, 1.3, 1],
                  x: [0, -10, 0],
                  y: [0, 10, 0],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.5,
                }}
              />
              
              {/* Liquid shimmer - rotating gradient */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(from 0deg, transparent 0%, ${colors.glow} 50%, transparent 100%)`,
                  opacity: 0.25,
                }}
                animate={{
                  rotate: 360,
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
              
              {/* Flowing liquid effect */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `linear-gradient(135deg, ${colors.glow} 0%, transparent 40%, ${colors.glow} 80%, transparent 100%)`,
                  opacity: 0.2,
                }}
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
              
              {/* Top highlight - water surface reflection */}
              <motion.div
                className="absolute top-0 left-0 right-0 rounded-full"
                style={{
                  height: '45%',
                  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, transparent 100%)',
                }}
                animate={{
                  opacity: isHovering ? [0.3, 0.5, 0.3] : [0.2, 0.3, 0.2],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              
              {/* Bubble effect */}
              <motion.div
                className="absolute rounded-full"
                style={{
                  width: '20%',
                  height: '20%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  left: '20%',
                  top: '60%',
                  filter: 'blur(2px)',
                }}
                animate={{
                  y: [0, -20, 0],
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 1,
                }}
              />
            </motion.div>
            
            {/* Cursor text with liquid glass background */}
            <AnimatePresence>
              {cursorText && (
                <motion.div
                  className="absolute rounded-full px-5 py-2.5"
                  style={{
                    background: colors.hoverBg,
                    backdropFilter: 'blur(20px) saturate(200%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(200%)',
                    boxShadow: `0 12px 40px 0 ${colors.glow}, inset 0 2px 4px rgba(255, 255, 255, 0.15)`,
                    color: colors.text,
                  }}
                  initial={{ opacity: 0, scale: 0.8, y: 15 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    y: 0,
                  }}
                  exit={{ opacity: 0, scale: 0.8, y: 15 }}
                  transition={{ 
                    duration: 0.4, 
                    ease: [0.34, 1.56, 0.64, 1],
                  }}
                >
                  <motion.span 
                    className="text-xs font-bold whitespace-nowrap tracking-wider"
                    animate={{
                      opacity: [0.8, 1, 0.8],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    {cursorText}
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

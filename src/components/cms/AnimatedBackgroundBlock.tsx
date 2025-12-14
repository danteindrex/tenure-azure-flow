import React from 'react'
import { Button } from '../ui/button'
import { HexagonBackground } from '../animate-ui/components/backgrounds/hexagon'
import { HoleBackground } from '../animate-ui/components/backgrounds/hole'
import { StarsBackground } from '../animate-ui/components/backgrounds/stars'
import { GravityStarsBackground } from '../animate-ui/components/backgrounds/gravity-stars'

interface AnimatedBackgroundBlockProps {
  backgroundType: 'hexagon' | 'hole' | 'stars' | 'gravity-stars'
  title?: string
  subtitle?: string
  overlay?: boolean
  hexagonSettings?: {
    strokeColor?: string
    numberOfLines?: number
  }
  holeSettings?: {
    strokeColor?: string
    numberOfLines?: number
    numberOfDiscs?: number
  }
  starsSettings?: {
    factor?: number
    speed?: number
    starColor?: string
  }
  gravityStarsSettings?: {
    particleCount?: number
    particleColor?: string
  }
  content?: {
    buttons?: Array<{
      text: string
      link: string
      variant: 'primary' | 'secondary' | 'liquid'
    }>
  }
}

export function AnimatedBackgroundBlock({
  backgroundType,
  title,
  subtitle,
  overlay = true,
  hexagonSettings,
  holeSettings,
  starsSettings,
  gravityStarsSettings,
  content,
}: AnimatedBackgroundBlockProps) {
  const renderBackground = () => {
    switch (backgroundType) {
      case 'hexagon':
        return (
          <HexagonBackground
            className="absolute inset-0"
          />
        )
      case 'hole':
        return (
          <HoleBackground
            className="absolute inset-0"
          />
        )
      case 'stars':
        return (
          <StarsBackground
            className="absolute inset-0"
          />
        )
      case 'gravity-stars':
        return (
          <GravityStarsBackground
            className="absolute inset-0"
          />
        )
      default:
        return null
    }
  }

  const getButtonVariant = (variant: string) => {
    switch (variant) {
      case 'primary': return 'default'
      case 'secondary': return 'secondary'
      case 'liquid': return 'default' // We'll handle liquid styling separately
      default: return 'default'
    }
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated Background */}
      {renderBackground()}
      
      {/* Overlay for better text readability */}
      {overlay && (
        <div className="absolute inset-0 bg-black/40" />
      )}
      
      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center px-4">
        {title && (
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="text-xl text-gray-100 mb-8 max-w-2xl mx-auto">
            {subtitle}
          </p>
        )}
        {content?.buttons && content.buttons.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {content.buttons.map((button, index) => (
              <Button
                key={index}
                variant={getButtonVariant(button.variant)}
                size="lg"
                className={button.variant === 'liquid' ? 'liquid-button' : ''}
                asChild
              >
                <a href={button.link}>{button.text}</a>
              </Button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
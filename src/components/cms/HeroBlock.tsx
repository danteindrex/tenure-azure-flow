import React from 'react'
import { Button } from '../ui/button'

interface HeroButton {
  text: string
  link: string
  variant: 'primary' | 'secondary' | 'outline'
}

interface HeroBlockProps {
  title: string
  subtitle?: string
  backgroundImage?: {
    url: string
    alt?: string
  }
  style: 'centered' | 'split' | 'minimal'
  buttons?: HeroButton[]
}

export function HeroBlock({ title, subtitle, backgroundImage, style, buttons }: HeroBlockProps) {
  const getButtonVariant = (variant: string) => {
    switch (variant) {
      case 'primary': return 'default'
      case 'secondary': return 'secondary'
      case 'outline': return 'outline'
      default: return 'default'
    }
  }

  if (style === 'minimal') {
    return (
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
          {buttons && buttons.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {buttons.map((button, index) => (
                <Button
                  key={index}
                  variant={getButtonVariant(button.variant)}
                  size="lg"
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

  if (style === 'split') {
    return (
      <section className="min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xl text-gray-600 mb-8">
                {subtitle}
              </p>
            )}
            {buttons && buttons.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-4">
                {buttons.map((button, index) => (
                  <Button
                    key={index}
                    variant={getButtonVariant(button.variant)}
                    size="lg"
                    asChild
                  >
                    <a href={button.link}>{button.text}</a>
                  </Button>
                ))}
              </div>
            )}
          </div>
          {backgroundImage && (
            <div className="aspect-square lg:aspect-auto lg:h-96 overflow-hidden rounded-2xl">
              <img
                src={backgroundImage.url}
                alt={backgroundImage.alt || title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </section>
    )
  }

  // Centered style (default)
  return (
    <section 
      className="min-h-screen flex items-center justify-center relative"
      style={backgroundImage ? {
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${backgroundImage.url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : undefined}
    >
      <div className="max-w-4xl mx-auto text-center px-4">
        <h1 className={`text-4xl md:text-6xl font-bold mb-6 ${
          backgroundImage ? 'text-white' : 'text-gray-900'
        }`}>
          {title}
        </h1>
        {subtitle && (
          <p className={`text-xl mb-8 max-w-2xl mx-auto ${
            backgroundImage ? 'text-gray-100' : 'text-gray-600'
          }`}>
            {subtitle}
          </p>
        )}
        {buttons && buttons.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {buttons.map((button, index) => (
              <Button
                key={index}
                variant={getButtonVariant(button.variant)}
                size="lg"
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